// Resetea la contraseña del usuario admin
// Uso: node scripts/reset-admin.js [nueva_contraseña]
// Ejemplo: node scripts/reset-admin.js admin123

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const newPassword = process.argv[2] || 'admin123';

  const hash = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.upsert({
    where:  { email: 'admin@allice.cl' },
    update: { password_hash: hash, role: 'admin' },
    create: { name: 'Administrador', email: 'admin@allice.cl', password_hash: hash, role: 'admin' },
  });

  console.log(`✅ Admin actualizado: ${user.email} (id: ${user.id})`);
  console.log(`   Contraseña: ${newPassword}`);
}

main()
  .catch((e) => { console.error('Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
