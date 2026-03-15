const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed All ice...');

  const [adminHash, tereHash, eduHash] = await Promise.all([
    bcrypt.hash('admin123',   10),
    bcrypt.hash('tere123',    10),
    bcrypt.hash('eduardo123', 10),
  ]);

  await prisma.user.upsert({
    where:  { email: 'admin@allice.cl' },
    update: {},
    create: { name: 'Administrador', email: 'admin@allice.cl', password_hash: adminHash, role: 'admin' },
  });

  await prisma.user.upsert({
    where:  { email: 'teresa@allice.cl' },
    update: {},
    create: { name: 'Teresa', email: 'teresa@allice.cl', password_hash: tereHash, role: 'vendedor' },
  });

  await prisma.user.upsert({
    where:  { email: 'eduardo@allice.cl' },
    update: {},
    create: { name: 'Eduardo', email: 'eduardo@allice.cl', password_hash: eduHash, role: 'produccion' },
  });

  console.log('✅ Usuarios creados/actualizados');
  console.log('\n🎉 Seed completado — sin datos de demo');
  console.log('\nCredenciales:');
  console.log('  Admin:    admin@allice.cl   / admin123');
  console.log('  Teresa:   teresa@allice.cl  / tere123');
  console.log('  Eduardo:  eduardo@allice.cl / eduardo123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
