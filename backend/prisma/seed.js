// Carga backend/.env para uso local; en Vercel las env vars ya están puestas.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const USUARIOS = [
  { name: 'Administrador', email: 'admin@allice.cl',   password: 'admin123',   role: 'admin' },
  { name: 'Teresa',        email: 'teresa@allice.cl',  password: 'tere123',    role: 'vendedor' },
  { name: 'Eduardo',       email: 'eduardo@allice.cl', password: 'eduardo123', role: 'produccion' },
];

/**
 * Crea (o deja como está) los usuarios base.
 * Recibe el cliente Prisma para poder reutilizarse desde otros scripts —
 * scripts/reset-db.js lo llama tras vaciar la tabla User.
 */
async function seed(prisma) {
  console.log('🌱 Iniciando seed All ice...');

  for (const u of USUARIOS) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        name:          u.name,
        email:         u.email,
        password_hash: await bcrypt.hash(u.password, 10),
        role:          u.role,
      },
    });
  }

  console.log('✅ Usuarios creados/actualizados');
  console.log('\n🎉 Seed completado — sin datos de demo');
  console.log('\nCredenciales:');
  for (const u of USUARIOS) {
    console.log(`  ${u.name.padEnd(14)} ${u.email.padEnd(20)} / ${u.password}`);
  }
}

module.exports = { seed, USUARIOS };

// Ejecutado directamente (npm run seed): abre su propia conexión y la cierra.
if (require.main === module) {
  const prisma = new PrismaClient();
  seed(prisma)
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
}
