/**
 * Reseteo de datos de All ice.
 *
 * Por defecto borra SOLO el movimiento acumulado —kilos cargados a congeladora,
 * pedidos, visitas y cierres de mes— y deja intacto todo lo que cuesta
 * recuperar: los negocios con sus teléfonos y direcciones, el historial de
 * contactos de WhatsApp y los usuarios con sus contraseñas actuales.
 *
 * Borrar los contactos exige pedirlo explícitamente.
 *
 * Uso:
 *   node backend/scripts/reset-db.js                      # muestra qué borraría, NO borra
 *   node backend/scripts/reset-db.js --confirm             # kilos, pedidos, visitas y cierres a 0
 *
 * Opciones (todas se combinan con --confirm):
 *   --conservar-visitas   no borra el historial de visitas
 *   --borrar-contactos    borra también el historial de contactos de WhatsApp
 *   --borrar-negocios     borra también los negocios (arrastra sus visitas,
 *                         pedidos y contactos de WhatsApp por clave foránea)
 *   --incluir-usuarios    borra también los usuarios y los recrea desde el seed
 *
 * Es IRREVERSIBLE: si hay algo que rescatar, saca respaldo antes
 * (en Neon: Branches → crear una rama desde el punto actual).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const args             = process.argv.slice(2);
const tiene            = (flag) => args.includes(flag);
const confirmado       = tiene('--confirm');
const conservarVisitas = tiene('--conservar-visitas');
const borrarContactos  = tiene('--borrar-contactos');
const borrarNegocios   = tiene('--borrar-negocios');
const incluirUsuarios  = tiene('--incluir-usuarios');

// Movimiento: lo que hay que poner a cero para empezar un período limpio.
const SIEMPRE = ['Order', 'CierreMesDetalle', 'CierreMes', 'LoteProduccion'];

function tablasABorrar() {
  return [
    ...SIEMPRE,
    ...(conservarVisitas ? [] : ['VisitLog']),
    ...(borrarContactos  ? ['WhatsAppContact'] : []),
    ...(borrarNegocios   ? ['Business'] : []),
    ...(incluirUsuarios  ? ['User'] : []),
  ];
}

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
  const vendidos = await prisma.order.aggregate({ _sum: { kilos: true } });
  const cargados = await prisma.loteProduccion.aggregate({ _sum: { kilos: true } });

  return {
    'Kilos cargados (suma)': cargados._sum.kilos || 0,
    'Kilos vendidos (suma)': vendidos._sum.kilos || 0,
    Pedidos: orders,
    'Cargas a congeladora': lotes,
    'Cierres de mes': cierres,
    'Detalles de cierre': detalles,
    Visitas: visitas,
    'Contactos WhatsApp': whatsapp,
    Negocios: negocios,
    Usuarios: usuarios,
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

  const borrar = tablasABorrar();

  const conservar = [
    ...(conservarVisitas         ? ['visitas'] : []),
    ...(borrarContactos          ? [] : ['contactos de WhatsApp']),
    ...(borrarNegocios           ? [] : ['negocios (nombres, teléfonos, direcciones)']),
    ...(incluirUsuarios          ? [] : ['usuarios y sus contraseñas actuales']),
  ];

  console.log('\n🗑️  SE BORRA (y los contadores de ID vuelven a 1):');
  console.log(`   ${borrar.join(', ')}`);

  if (conservar.length > 0) {
    console.log('\n🔒 SE CONSERVA:');
    for (const c of conservar) console.log(`   · ${c}`);
  }

  if (borrarNegocios) {
    console.log(
      '\n⚠️  Al borrar los negocios se van con ellos sus visitas, pedidos y\n' +
      '   contactos de WhatsApp: dependen del negocio por clave foránea.'
    );
  }

  if (!confirmado) {
    console.log('\n✋ Nada fue borrado (falta --confirm). Para ejecutarlo de verdad:');
    console.log(`   node backend/scripts/reset-db.js --confirm ${args.filter((a) => a !== '--confirm').join(' ')}`.trimEnd());
    return;
  }

  const lista = borrar.map((t) => `"${t}"`).join(', ');
  console.log('\nBorrando...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);

  if (!borrarNegocios) {
    // Sin pedidos ni visitas ningún negocio puede seguir marcado como cliente
    // activo; se conservan sus datos de contacto, solo cambia el estado.
    const { count } = await prisma.business.updateMany({
      data: { estado_visita: 'no_visitado', kilos_al_eliminar: null },
    });
    console.log(`   ${count} negocios conservados, devueltos a "no_visitado".`);
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
