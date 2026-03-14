const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Crear usuario admin
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tere.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@tere.com',
      password_hash: adminHash,
      role: 'admin',
    },
  });
  console.log('✅ Admin creado:', admin.email);

  // Crear usuario vendedor (Tere)
  const tereHash = await bcrypt.hash('tere123', 10);
  const tere = await prisma.user.upsert({
    where: { email: 'tere@tere.com' },
    update: {},
    create: {
      name: 'Tere',
      email: 'tere@tere.com',
      password_hash: tereHash,
      role: 'vendedor',
    },
  });
  console.log('✅ Vendedor creado:', tere.email);

  // Crear algunos negocios de ejemplo
  const negociosEjemplo = [
    {
      nombre: 'Almacén El Sol',
      direccion: 'Av. Principal 123',
      persona_cargo: 'Juan Pérez',
      telefono: '+56912345678',
      lat: -33.4569,
      lng: -70.6483,
      estado_visita: 'cliente_activo',
      creado_por: tere.id,
    },
    {
      nombre: 'Minimarket La Estrella',
      direccion: 'Calle Sur 456',
      persona_cargo: 'María García',
      telefono: '+56987654321',
      lat: -33.4600,
      lng: -70.6520,
      estado_visita: 'visitado_sin_venta',
      creado_por: tere.id,
    },
    {
      nombre: 'Bodega Don Pedro',
      direccion: 'Los Pinos 789',
      persona_cargo: 'Pedro López',
      telefono: '+56911223344',
      lat: -33.4530,
      lng: -70.6450,
      estado_visita: 'no_visitado',
      creado_por: tere.id,
    },
  ];

  for (const negocio of negociosEjemplo) {
    const existing = await prisma.business.findFirst({
      where: { nombre: negocio.nombre, creado_por: tere.id },
    });
    if (!existing) {
      const b = await prisma.business.create({ data: negocio });
      // Crear visitas y pedidos de ejemplo para el primero
      if (negocio.nombre === 'Almacén El Sol') {
        const hace10 = new Date();
        hace10.setDate(hace10.getDate() - 10);
        const hace5 = new Date();
        hace5.setDate(hace5.getDate() - 5);

        await prisma.visitLog.create({
          data: {
            business_id: b.id,
            user_id: tere.id,
            fecha: hace10,
            tipo: 'visita_con_venta',
            comentario: 'Primera visita exitosa',
          },
        });
        await prisma.order.create({
          data: {
            business_id: b.id,
            user_id: tere.id,
            fecha: hace10,
            kilos: 50,
            estado_pedido: 'entregado',
            estado_pago: 'pagado',
            estado_factura: 'facturado',
          },
        });
        await prisma.visitLog.create({
          data: {
            business_id: b.id,
            user_id: tere.id,
            fecha: hace5,
            tipo: 'visita_con_venta',
            comentario: 'Segunda visita',
          },
        });
        await prisma.order.create({
          data: {
            business_id: b.id,
            user_id: tere.id,
            fecha: hace5,
            kilos: 75,
            estado_pedido: 'pendiente',
            estado_pago: 'pendiente',
            estado_factura: 'sin_factura',
          },
        });
      }
      console.log('✅ Negocio creado:', negocio.nombre);
    }
  }

  console.log('🎉 Seed completado!');
  console.log('');
  console.log('Credenciales:');
  console.log('  Admin:    admin@tere.com / admin123');
  console.log('  Vendedor: tere@tere.com  / tere123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
