require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const app = require('./app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📊 Entorno: ${process.env.NODE_ENV}`);
});

module.exports = app;
