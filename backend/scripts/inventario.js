/**
 * Reporte de solo lectura: qué hay realmente en la base, mes por mes.
 *
 * Sirve para entender de dónde salen los números de la pantalla de Fábrica
 * antes de borrar nada. No modifica absolutamente nada.
 *
 * Uso:
 *   node backend/scripts/inventario.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const clp = (n) => '$' + Math.round(n || 0).toLocaleString('es-CL');
const kg  = (n) => `${Math.round((n || 0) * 100) / 100} kg`;

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const periodo = (fecha) => `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;

/** Agrupa por mes sumando lo que devuelva `valor`. */
function porMes(filas, valor) {
  const mapa = new Map();
  for (const f of filas) {
    const clave = periodo(new Date(f.fecha));
    const acum = mapa.get(clave) || { kilos: 0, monto: 0, n: 0, orden: new Date(f.fecha) };
    const v = valor(f);
    acum.kilos += v.kilos;
    acum.monto += v.monto;
    acum.n     += 1;
    if (new Date(f.fecha) < acum.orden) acum.orden = new Date(f.fecha);
    mapa.set(clave, acum);
  }
  return [...mapa.entries()].sort((a, b) => a[1].orden - b[1].orden);
}

async function main() {
  console.log('🧊 All ice — inventario y ventas (solo lectura, no borra nada)');
  console.log(`   Base: ${(process.env.DATABASE_URL || '').replace(/:[^:@/]*@/, ':****@') || '(DATABASE_URL no definida)'}`);

  const [lotes, pedidos] = await Promise.all([
    prisma.loteProduccion.findMany({ orderBy: { fecha: 'asc' } }),
    prisma.order.findMany({
      where:   { business: { deleted_at: null } },
      include: { business: { select: { nombre: true } } },
      orderBy: { fecha: 'asc' },
    }),
  ]);

  // ── Cargas a congeladora ────────────────────────────────────────────────
  console.log('\n━━━ CARGAS A CONGELADORA, por mes ━━━');
  if (lotes.length === 0) {
    console.log('   (ninguna carga registrada)');
  } else {
    for (const [mes, d] of porMes(lotes, (l) => ({ kilos: l.kilos, monto: l.kilos * 400 }))) {
      console.log(`   ${mes.padEnd(10)} ${kg(d.kilos).padStart(11)}  en ${d.n} carga(s)`);
    }
  }
  const totalCargado = lotes.reduce((s, l) => s + l.kilos, 0);
  console.log(`   ${'TOTAL'.padEnd(10)} ${kg(totalCargado).padStart(11)}`);

  // ── Ventas ──────────────────────────────────────────────────────────────
  console.log('\n━━━ VENTAS, por mes ━━━');
  if (pedidos.length === 0) {
    console.log('   (ningún pedido registrado)');
  } else {
    for (const [mes, d] of porMes(pedidos, (p) => ({ kilos: p.kilos, monto: p.monto_total || p.kilos * 400 }))) {
      console.log(`   ${mes.padEnd(10)} ${kg(d.kilos).padStart(11)}  ${clp(d.monto).padStart(11)}  en ${d.n} pedido(s)`);
    }
  }
  const totalVendido = pedidos.reduce((s, p) => s + p.kilos, 0);
  const totalPlata   = pedidos.reduce((s, p) => s + (p.monto_total || p.kilos * 400), 0);
  console.log(`   ${'TOTAL'.padEnd(10)} ${kg(totalVendido).padStart(11)}  ${clp(totalPlata).padStart(11)}`);

  // ── De dónde sale el stock ──────────────────────────────────────────────
  console.log('\n━━━ CÓMO SE CALCULA EL STOCK ━━━');
  const primera = lotes[0];
  if (!primera) {
    console.log('   Sin cargas registradas: no hay stock que calcular.');
  } else {
    const desde     = new Date(primera.fecha);
    const antes     = pedidos.filter((p) => new Date(p.fecha) <  desde);
    const despues   = pedidos.filter((p) => new Date(p.fecha) >= desde);
    const kgAntes   = antes.reduce((s, p) => s + p.kilos, 0);
    const kgDespues = despues.reduce((s, p) => s + p.kilos, 0);

    console.log(`   Primera carga registrada: ${desde.toLocaleString('es-CL')}`);
    console.log(`   Cargado desde entonces:   ${kg(totalCargado)}`);
    console.log(`   Vendido desde entonces:   ${kg(kgDespues)}`);
    console.log(`   ─────────────────────────────────────`);
    console.log(`   STOCK EN CONGELADORA:     ${kg(Math.max(0, totalCargado - kgDespues))}`);

    if (kgAntes > 0) {
      console.log(
        `\n   ⚠️  Hay ${kg(kgAntes)} vendidos en ${antes.length} pedido(s) ANTERIORES a la primera\n` +
        '      carga. No descuentan stock: la app no sabe qué había en la congeladora\n' +
        '      en esa época. Si quieres partir limpio, esos son los que conviene borrar.'
      );
      console.log('\n      Pedidos anteriores a la primera carga:');
      for (const p of antes) {
        console.log(
          `        ${new Date(p.fecha).toLocaleDateString('es-CL').padEnd(11)} ` +
          `${p.business.nombre.padEnd(24).slice(0, 24)} ${kg(p.kilos).padStart(9)} ${clp(p.monto_total || p.kilos * 400).padStart(10)}`
        );
      }
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────');
  console.log('Para borrar el histórico:  npm run reset:db          (muestra qué borraría)');
  console.log('                           npm run reset:db -- --confirm');
}

main()
  .catch((e) => { console.error('\n💥 Error:', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
