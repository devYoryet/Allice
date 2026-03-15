// Carga .env desde backend/ para desarrollo local;
// en Vercel las env vars ya están en process.env y dotenv solo hace no-op.
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes      = require('./routes/auth');
const businessRoutes  = require('./routes/businesses');
const visitRoutes     = require('./routes/visits');
const orderRoutes     = require('./routes/orders');
const reportRoutes    = require('./routes/reports');
const produccionRoutes = require('./routes/produccion');

const app = express();

// Middlewares globales
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean).map(o => o.replace(/\/$/, '')); // quita trailing slash

app.use(cors({
  origin: (origin, cb) => {
    // Sin origin: Postman, curl, SSR → OK
    if (!origin) return cb(null, true);
    // URL exacta en la lista
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // Cualquier subdominio de vercel.app (previews, producción)
    if (/^https:\/\/[a-z0-9-]+(\.vercel\.app)$/.test(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/businesses/:businessId/visits', visitRoutes);
app.use('/api/businesses/:businessId/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/produccion', produccionRoutes);

// Rutas de pedidos globales
const { getAll: getAllOrders, update: updateOrder } = require('./controllers/orderController');
const { authenticate } = require('./middleware/auth');
app.get('/api/orders', authenticate, getAllOrders);
app.put('/api/orders/:id', authenticate, updateOrder);

// Servir frontend en producción (cuando el backend sirve los estáticos)
if (process.env.SERVE_STATIC === 'true') {
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
}

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;
