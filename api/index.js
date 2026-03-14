// Entry point para Vercel serverless functions
// Vercel enruta /api/* → este archivo gracias al rewrite en vercel.json
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const app = require('../backend/src/app');

module.exports = app;
