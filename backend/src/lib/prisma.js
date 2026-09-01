/**
 * Cliente Prisma único para toda la app.
 *
 * Antes cada controlador hacía `new PrismaClient()`: 9 controladores + el
 * middleware de auth = 10 clientes, cada uno con su propio pool de conexiones.
 * En Vercel (serverless) cada instancia de la función abría decenas de
 * conexiones contra Neon y, al agotarse el límite, las peticiones empezaban a
 * fallar de forma intermitente con 500. Con un singleton hay un solo pool.
 *
 * `globalThis` conserva la instancia entre recargas de nodemon en desarrollo y
 * entre invocaciones que reutilizan el mismo contenedor en producción.
 */
const { PrismaClient } = require('@prisma/client');

const prisma =
  globalThis.__allicePrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  });

globalThis.__allicePrisma = prisma;

module.exports = prisma;
