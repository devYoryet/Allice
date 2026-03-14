// Entry point para Vercel serverless functions.
// Vercel instala deps en root node_modules, por eso los require de app.js
// encuentran express, prisma, etc. sin problemas.
const app = require('../backend/src/app');

module.exports = app;
