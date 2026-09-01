/**
 * Reseteo total de datos de All ice.
 *
 * Borra el movimiento acumulado —kilos cargados, pedidos, visitas, contactos de
 * WhatsApp y cierres de mes— y reinicia los contadores de ID para empezar de
 * cero. Por defecto CONSERVA los usuarios (para no perder las contraseñas que
 * ya cambiaron) y borra los negocios.
 *
 * Uso:
 *   node backend/scripts/reset-db.js                        # muestra qué borraría (no borra)
 *   node backend/scripts/reset-db.js --confirm               # borra datos, conserva usuarios
 *   node backend/scripts/reset-db.js --confirm --conservar-negocios
 *   node backend/scripts/reset-db.js --confirm --incluir-usuarios   # deja la base como recién instalada
 *
 * Es una operación IRREVERSIBLE: saca respaldo antes si hay algo que rescatar
 * (en Neon: Branches → crear branch desde el punto actual).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const args               = process.argv.slice(2);
const confirmado         = args.includes('--confirm');
const conservarNegocios  = args.includes('--conservar-negocios');
const incluirUsuarios    = args.includes('--incluir-usuarios');

// Orden de arriba hacia abajo: primero lo que depende de otras tablas.
// TRUNCATE ... CASCADE resuelve las FK, pero listarlas explícitas deja claro
// qué se borra y evita truncar por accidente algo que no está en la lista.
const TABLAS_MOVIMIENTO = [
  'Order',
  'VisitLog',
  'WhatsAppContact',
  'CierreMesDetalle',
  'CierreMes',
  'LoteProduccion',
];

async function conteos() {
  const [orders, visitas, whatsapp, detalles, cierres, lotes, negocios, usuarios] = await Promise.all([
    prisma.order.count(),
    prisma.visitLog.count(),
    prisma.whatsAppContact.count(),
    prisma.cierreMesDetalle.count(),
    prisma.cierreMes.count(),
    prisma.loteProduccion.count(),
    prisma.business.count(),
    prisma.user.count(),
  ]);
  const kilosVendidos = await prisma.order.aggregate({ _sum: { kilos: true } });
  const kilosCargados = await prisma.loteProduccion.aggregate({ _sum: { kilos: true } });

  return {
    Pedidos: orders,
    Visitas: visitas,
    'Contactos WhatsApp': whatsapp,
    'Cierres de mes': cierres,
    'Detalles de cierre': detalles,
    'Cargas a congeladora': lotes,
    Negocios: negocios,
    Usuarios: usuarios,
    'Kilos vendidos (suma)': kilosVendidos._sum.kilos || 0,
    'Kilos cargados (suma)': kilosCargados._sum.kilos || 0,
  };
}

function tabla(titulo, datos) {
  console.log(`\n${titulo}`);
  const ancho = Math.max(...Object.keys(datos).map((k) => k.length));
  for (const [k, v] of Object.entries(datos)) {
    console.log(`  ${k.padEnd(ancho)}  ${String(v).padStart(8)}`);
  }
}

async function main() {
  console.log('🧊 All ice — reseteo de base de datos');
  console.log(`   Base: ${(process.env.DATABASE_URL || '').replace(/:[^:@/]*@/, ':****@') || '(DATABASE_URL no definida)'}`);

  tabla('Estado actual:', await conteos());

  const objetivo = [
    ...TABLAS_MOVIMIENTO,
    ...(conservarNegocios ? [] : ['Business']),
    ...(incluirUsuarios   ? ['User'] : []),
  ];

  console.log('\nSe vaciarán estas tablas y sus contadores de ID volverán a 1:');
  console.log(`  ${objetivo.join(', ')}`);
  if (conservarNegocios) console.log('  → Se conservan los negocios (su estado vuelve a "no_visitado").');
  if (!incluirUsuarios)  console.log('  → Se conservan los usuarios y sus contraseñas actuales.');

  if (!confirmado) {
    console.log('\n⚠️  Nada fue borrado. Para ejecutarlo de verdad agrega --confirm:');
    console.log(`   node backend/scripts/reset-db.js --confirm${args.filter((a) => a !== '--confirm').join(' ') ? ' ' + args.join(' ') : ''}`);
    return;
  }

  const lista = objetivo.map((t) => `"${t}"`).join(', ');
  console.log('\n🗑️  Borrando...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);

  if (conservarNegocios) {
    // Sin pedidos ni visitas, ningún negocio puede seguir marcado como cliente activo.
    const { count } = await prisma.business.updateMany({
      data: { estado_visita: 'no_visitado', kilos_al_eliminar: null },
    });
    console.log(`   ${count} negocios devueltos a "no_visitado".`);
  }

  if (incluirUsuarios) {
    console.log('\n👤 Recreando usuarios base...');
    const { seed } = require('../prisma/seed.js');
    await seed(prisma);
  }

  tabla('Estado final:', await conteos());
  console.log('\n✅ Reseteo completo. El stock de congeladora y los kilos del mes parten de 0.');
}

main()
  .catch((e) => { console.error('\n💥 Error:', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
