const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed All ice...');

  // ── Usuarios ────────────────────────────────────────────────────
  const [adminHash, tereHash, eduHash] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('tere123',  10),
    bcrypt.hash('eduardo123', 10),
  ]);

  const admin = await prisma.user.upsert({
    where:  { email: 'admin@allice.cl' },
    update: {},
    create: { name: 'Administrador', email: 'admin@allice.cl', password_hash: adminHash, role: 'admin' },
  });

  const tere = await prisma.user.upsert({
    where:  { email: 'teresa@allice.cl' },
    update: {},
    create: { name: 'Teresa', email: 'teresa@allice.cl', password_hash: tereHash, role: 'vendedor' },
  });

  const eduardo = await prisma.user.upsert({
    where:  { email: 'eduardo@allice.cl' },
    update: {},
    create: { name: 'Eduardo', email: 'eduardo@allice.cl', password_hash: eduHash, role: 'produccion' },
  });

  console.log('✅ Usuarios: admin, teresa, eduardo');

  // ── Negocios de ejemplo ─────────────────────────────────────────
  const negocios = [
    { nombre: 'Almacén El Sol',          direccion: 'Av. Portales 123, Santiago Centro', persona_cargo: 'Juan Pérez',  telefono: '+56912345678', lat: -33.4569, lng: -70.6483, estado_visita: 'cliente_activo' },
    { nombre: 'Minimarket La Estrella',  direccion: 'Calle San Pablo 456, Pudahuel',     persona_cargo: 'María García',telefono: '+56987654321', lat: -33.4600, lng: -70.6520, estado_visita: 'visitado_sin_venta' },
    { nombre: 'Bodega Don Pedro',        direccion: 'Los Pinos 789, Maipú',              persona_cargo: 'Pedro López', telefono: '+56911223344', lat: -33.4530, lng: -70.6450, estado_visita: 'no_visitado' },
    { nombre: 'Botillería El Rápido',    direccion: 'Gran Avenida 1200, San Miguel',     persona_cargo: null,          telefono: '+56922334455', lat: -33.4980, lng: -70.6600, estado_visita: 'no_visitado' },
    { nombre: 'Supermercado Familiar',   direccion: 'Av. Vicuña Mackenna 890, Macul',   persona_cargo: 'Rosa Díaz',   telefono: '+56933445566', lat: -33.4801, lng: -70.6100, estado_visita: 'cliente_activo' },
  ];

  for (const negocio of negocios) {
    const existing = await prisma.business.findFirst({ where: { nombre: negocio.nombre } });
    if (!existing) {
      const b = await prisma.business.create({ data: { ...negocio, creado_por: tere.id } });

      if (negocio.estado_visita === 'cliente_activo') {
        const hace10 = new Date(); hace10.setDate(hace10.getDate() - 10);
        const hace3  = new Date(); hace3.setDate(hace3.getDate() - 3);

        await prisma.visitLog.create({ data: { business_id: b.id, user_id: tere.id, fecha: hace10, tipo: 'visita_con_venta', comentario: 'Visita inicial exitosa' } });
        await prisma.order.create({
          data: {
            business_id: b.id, user_id: tere.id, fecha: hace10,
            kilos: 50, precio_kg: 400, con_iva: false,
            monto_neto: 20000, monto_total: 20000,
            estado_pedido: 'entregado', estado_pago: 'pagado', estado_factura: 'sin_factura',
          },
        });

        await prisma.visitLog.create({ data: { business_id: b.id, user_id: tere.id, fecha: hace3, tipo: 'visita_con_venta' } });
        await prisma.order.create({
          data: {
            business_id: b.id, user_id: tere.id, fecha: hace3,
            kilos: 75, precio_kg: 400, con_iva: true,
            monto_neto: 30000, monto_total: 35700,
            estado_pedido: 'pendiente', estado_pago: 'pendiente', estado_factura: 'facturado',
          },
        });
      }

      if (negocio.estado_visita === 'visitado_sin_venta') {
        const hace2 = new Date(); hace2.setDate(hace2.getDate() - 2);
        await prisma.visitLog.create({ data: { business_id: b.id, user_id: tere.id, fecha: hace2, tipo: 'visita_sin_venta', comentario: 'No quiso comprar, volver en una semana' } });
      }

      console.log('✅ Negocio:', negocio.nombre);
    }
  }

  // ── Lotes de producción de ejemplo ─────────────────────────────
  const loteExistente = await prisma.loteProduccion.findFirst();
  if (!loteExistente) {
    const hace2 = new Date(); hace2.setDate(hace2.getDate() - 2);
    const hace1 = new Date(); hace1.setDate(hace1.getDate() - 1);
    const disp1 = new Date(); disp1.setDate(disp1.getDate() - 1); disp1.setHours(disp1.getHours() + 12);

    await prisma.loteProduccion.create({
      data: {
        fecha_inicio: hace2, kg_programados: 400, kg_producidos: 390, bolsas: 390,
        estado: 'disponible', horas_congelado: 12, fecha_disponible: disp1,
        notas: 'Primer lote de prueba', creado_por: eduardo.id,
      },
    });

    const hoyInicio = new Date(); hoyInicio.setHours(hoyInicio.getHours() - 6);
    const hoyDisp = new Date(); hoyDisp.setHours(hoyDisp.getHours() + 6);
    await prisma.loteProduccion.create({
      data: {
        fecha_inicio: hoyInicio, kg_programados: 500, bolsas: null,
        estado: 'congelando', horas_congelado: 12, fecha_disponible: hoyDisp,
        notas: 'Lote en congeladora', creado_por: eduardo.id,
      },
    });

    console.log('✅ Lotes de producción creados');
  }

  console.log('\n🎉 Seed completado!');
  console.log('\nCredenciales de acceso:');
  console.log('  Admin:     admin@allice.cl    / admin123');
  console.log('  Teresa:    teresa@allice.cl   / tere123');
  console.log('  Eduardo:   eduardo@allice.cl  / eduardo123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
