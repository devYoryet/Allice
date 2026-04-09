/**
 * Reset password for admin@allice.cl
 * Usage: node scripts/reset-admin.js <nueva_contraseña>
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const newPassword = process.argv[2];

  if (!newPassword) {
    console.error('❌ Debes pasar la nueva contraseña como argumento.');
    console.error('   Uso: node scripts/reset-admin.js <nueva_contraseña>');
    process.exit(1);
  }

  const adminEmail = 'admin@allice.cl';

  const admin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!admin) {
    console.error(`❌ Usuario ${adminEmail} no encontrado en la base de datos.`);
    process.exit(1);
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email: adminEmail },
    data:  { password_hash: newHash },
  });

  console.log(`✅ Contraseña de ${adminEmail} actualizada correctamente.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
