require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/businesses');
const visitRoutes = require('./routes/visits');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globales
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/businesses/:businessId/visits', visitRoutes);
app.use('/api/businesses/:businessId/orders', orderRoutes);
app.use('/api/reports', reportRoutes);

// Ruta general de pedidos (para listar todos)
const { getAll: getAllOrders, update: updateOrder } = require('./controllers/orderController');
const { authenticate } = require('./middleware/auth');
app.get('/api/orders', authenticate, getAllOrders);
app.put('/api/orders/:id', authenticate, updateOrder);

// Servir el frontend en producción
if (process.env.NODE_ENV === 'production') {
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Entorno: ${process.env.NODE_ENV}`);
});

module.exports = app;
