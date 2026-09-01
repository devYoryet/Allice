/**
 * Preparación de la base para cada despliegue. Reemplaza al
 * `prisma migrate deploy && node prisma/seed.js` del vercel-build.
 *
 * El problema que resuelve: si una migración queda en estado failed, Prisma se
 * niega a aplicar las siguientes y el build entero se cae. Eso fue lo que dejó
 * a LoteProduccion con el esquema viejo y rompió el registro de kilos, y
 * arreglarlo exigía entrar a mano con la DATABASE_URL de producción.
 *
 * Secuencia:
 *   1. Destraba las migraciones fallidas que son idempotentes (reintentarlas no
 *      arregla nada porque volverían a fallar en el mismo punto).
 *   2. prisma migrate deploy
 *   3. Red de seguridad: aplica la reparación de LoteProduccion directamente,
 *      por si una migración quedó marcada como aplicada sin haber corrido.
 *   4. Seed de usuarios base.
 *
 * Si falla algo distinto, el proceso termina con error y el deploy se detiene:
 * la idea es destrabar un caso conocido, no esconder problemas nuevos.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const { splitStatements } = require('./lib/sql');

const prisma = new PrismaClient();

// Migraciones escritas con IF NOT EXISTS / DO $$ guardados: si fallaron a mitad,
// lo ya hecho es correcto y el resto lo cubre la migración de reparación.
// El init NO está en la lista: un fallo ahí es grave y debe detener el deploy.
const IDEMPOTENTES = new Set([
  '20260315000000_add_produccion_pricing',
  '20260316000000_simplify_lotes',
  '20260316010000_business_soft_delete',
  '20260409000000_add_cierre_mes',
  '20260409010000_add_whatsapp_contacts',
  '20260409020000_add_order_origen',
]);

const REPARACION = path.join(
  __dirname,
  '../prisma/migrations/20260901000000_repair_lote_produccion/migration.sql'
);

function prismaCli(...args) {
  execFileSync('npx', ['prisma', ...args], { stdio: 'inherit' });
}

/** Migraciones empezadas y nunca terminadas (fallidas o interrumpidas). */
async function migracionesTrabadas() {
  try {
    return await prisma.$queryRaw`
      SELECT migration_name
      FROM "_prisma_migrations"
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
      ORDER BY started_at
    `;
  } catch (err) {
    // Base nueva: la tabla aún no existe, así que no hay nada trabado.
    if (/_prisma_migrations/.test(err.message)) return [];
    throw err;
  }
}

async function destrabar() {
  const trabadas = await migracionesTrabadas();
  if (trabadas.length === 0) {
    console.log('   Sin migraciones trabadas.');
    return;
  }

  console.log(`   ⚠️  ${trabadas.length} migración(es) en estado fallido:`);
  for (const { migration_name } of trabadas) console.log(`      · ${migration_name}`);

  const desconocidas = trabadas.filter((m) => !IDEMPOTENTES.has(m.migration_name));
  if (desconocidas.length > 0) {
    throw new Error(
      `No se destraban automáticamente: ${desconocidas.map((m) => m.migration_name).join(', ')}. ` +
      'Revísalas a mano antes de desplegar.'
    );
  }

  for (const { migration_name } of trabadas) {
    console.log(`      → marcando ${migration_name} como aplicada (es idempotente)`);
    prismaCli('migrate', 'resolve', '--applied', migration_name);
  }
}

async function repararEsquema() {
  const sentencias = splitStatements(fs.readFileSync(REPARACION, 'utf8'));
  for (const sentencia of sentencias) await prisma.$executeRawUnsafe(sentencia);
  console.log(`   ${sentencias.length} sentencias de reparación verificadas.`);
}

async function main() {
  console.log('🧊 All ice — preparando la base de datos');

  console.log('\n[1/4] Revisando migraciones trabadas...');
  await destrabar();

  console.log('\n[2/4] Aplicando migraciones...');
  prismaCli('migrate', 'deploy');

  console.log('\n[3/4] Verificando el esquema de LoteProduccion...');
  await repararEsquema();

  console.log('\n[4/4] Usuarios base...');
  const { seed } = require('../prisma/seed.js');
  await seed(prisma);

  console.log('\n✅ Base lista.');
}

main()
  .catch((e) => { console.error('\n💥 Falló la preparación de la base:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
