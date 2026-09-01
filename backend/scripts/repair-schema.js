/**
 * Repara el esquema de "LoteProduccion" directamente contra la base.
 *
 * Para qué sirve: si `prisma migrate deploy` quedó trabado (una migración en
 * estado failed impide que corran las siguientes), la tabla conserva columnas
 * legacy NOT NULL y todo registro de carga a congeladora falla con 500. Este
 * script aplica el mismo SQL de la migración 20260901000000_repair_lote_produccion
 * sin pasar por el pipeline de migraciones, así que desatasca producción.
 *
 * Es idempotente: correrlo sobre una base sana no cambia nada.
 *
 * Uso:
 *   node backend/scripts/repair-schema.js            # diagnostica y repara
 *   node backend/scripts/repair-schema.js --dry-run  # solo diagnostica
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs   = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { splitStatements } = require('./lib/sql');

const prisma = new PrismaClient();

const MIGRACION = path.join(
  __dirname,
  '../prisma/migrations/20260901000000_repair_lote_produccion/migration.sql'
);

// Columnas del esquema viejo que rompen los INSERT de Prisma
const COLUMNAS_LEGACY = [
  'kg_programados', 'kg_producidos', 'bolsas',
  'estado', 'horas_congelado', 'fecha_disponible', 'updated_at',
];

async function columnasDe(tabla) {
  return prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = ${tabla}
    ORDER BY ordinal_position
  `;
}

function mostrarColumnas(titulo, columnas) {
  console.log(`\n${titulo}`);
  if (columnas.length === 0) {
    console.log('  (la tabla no existe)');
    return;
  }
  for (const c of columnas) {
    const nulo = c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL    ';
    const legacy = COLUMNAS_LEGACY.includes(c.column_name) ? '  ← legacy, sobra' : '';
    console.log(`  ${c.column_name.padEnd(18)} ${c.data_type.padEnd(26)} ${nulo}${legacy}`);
  }
}

/** Inserta una carga de prueba y la revierte: confirma que el INSERT real funciona. */
async function probarInsert() {
  const usuario = await prisma.user.findFirst({ select: { id: true, email: true } });
  if (!usuario) {
    console.log('\n⚠️  No hay usuarios en la base: no se puede probar el INSERT.');
    console.log('   Corre `npm run seed` y vuelve a ejecutar este script.');
    return;
  }

  const CENTINELA = 'ROLLBACK de prueba';
  try {
    await prisma.$transaction(async (tx) => {
      await tx.loteProduccion.create({
        data: { kilos: 200, horas_produccion: 15, notas: 'prueba repair-schema', creado_por: usuario.id },
      });
      throw new Error(CENTINELA); // aborta la transacción: nada queda escrito
    });
  } catch (err) {
    if (err.message === CENTINELA) {
      console.log(`\n✅ Prueba de INSERT de 200 kg: OK (revertida, no queda registrada).`);
      return;
    }
    console.error('\n❌ La prueba de INSERT de 200 kg FALLÓ:');
    console.error(`   ${err.code ? `[${err.code}] ` : ''}${err.message.split('\n').slice(-3).join(' ').trim()}`);
    throw err;
  }
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('🔍 Diagnóstico de "LoteProduccion"');
  const antes = await columnasDe('LoteProduccion');
  mostrarColumnas('Estado actual:', antes);

  const sobrantes = antes.filter((c) => COLUMNAS_LEGACY.includes(c.column_name));
  const bloqueantes = sobrantes.filter((c) => c.is_nullable === 'NO' && !c.column_default);

  if (sobrantes.length === 0 && antes.length > 0) {
    console.log('\n✅ El esquema ya está al día, no hay columnas legacy.');
  } else if (bloqueantes.length > 0) {
    console.log(
      `\n❌ Causa del fallo: ${bloqueantes.map((c) => c.column_name).join(', ')} ` +
      'son NOT NULL sin default y Prisma ya no las envía. Todo INSERT de carga falla.'
    );
  }

  if (dryRun) {
    console.log('\n(--dry-run: no se aplicó ningún cambio)');
    return;
  }

  const sentencias = splitStatements(fs.readFileSync(MIGRACION, 'utf8'));
  console.log(`\n🔧 Aplicando ${sentencias.length} sentencias de reparación...`);
  for (const [i, sentencia] of sentencias.entries()) {
    await prisma.$executeRawUnsafe(sentencia);
    process.stdout.write(`   ${i + 1}/${sentencias.length}\r`);
  }
  console.log(`   ${sentencias.length}/${sentencias.length} aplicadas.`);

  mostrarColumnas('Estado final:', await columnasDe('LoteProduccion'));
  await probarInsert();

  console.log('\n🎉 Reparación completa. Ya se pueden registrar cargas a congeladora.');
}

main()
  .catch((e) => { console.error('\n💥 Error:', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
