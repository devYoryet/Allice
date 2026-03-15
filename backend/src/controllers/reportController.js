const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Reporte semanal / mensual
const getSummary = async (req, res) => {
  try {
    const { period } = req.query; // 'week' | 'month'
    const now = new Date();
    const start = new Date();

    if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else {
      // semana: últimos 7 días
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    }

    const orders = await prisma.order.findMany({
      where: { fecha: { gte: start, lte: now } },
      include: { business: { select: { id: true, nombre: true } } },
    });

    const totalKilos = orders.reduce((sum, o) => sum + o.kilos, 0);
    const totalPedidos = orders.length;

    // Top negocios
    const byBusiness = {};
    orders.forEach((o) => {
      const key = o.business_id;
      if (!byBusiness[key]) {
        byBusiness[key] = { id: o.business.id, nombre: o.business.nombre, kilos: 0, pedidos: 0 };
      }
      byBusiness[key].kilos += o.kilos;
      byBusiness[key].pedidos += 1;
    });

    const topNegocios = Object.values(byBusiness)
      .sort((a, b) => b.kilos - a.kilos)
      .slice(0, 10);

    const totalNeto  = orders.reduce((sum, o) => sum + (o.monto_neto  || o.kilos * 400), 0);
    const totalTotal = orders.reduce((sum, o) => sum + (o.monto_total || o.kilos * 400), 0);
    const pendientes = orders.filter(o => o.estado_pago === 'pendiente').reduce((s,o) => s + (o.monto_total || o.kilos * 400), 0);

    // Tasa de conversión: visitas con venta / total visitas (en el período)
    const visitas = await prisma.visitLog.findMany({
      where: { fecha: { gte: start, lte: now } },
    });
    const conversionRate = visitas.length > 0
      ? Math.round((visitas.filter(v => v.tipo === 'visita_con_venta').length / visitas.length) * 100)
      : null;

    res.json({
      periodo: period || 'week',
      desde: start.toISOString(),
      hasta: now.toISOString(),
      total_kilos:    totalKilos,
      total_pedidos:  totalPedidos,
      total_neto:     Math.round(totalNeto),
      total_ingresos: Math.round(totalTotal),
      cobro_pendiente: Math.round(pendientes),
      conversion_rate: conversionRate,
      total_visitas:  visitas.length,
      top_negocios: topNegocios,
    });
  } catch (error) {
    console.error('Error getSummary:', error);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
};

// Comparación entre rangos de fechas
const compareRanges = async (req, res) => {
  try {
    const { desde1, hasta1, desde2, hasta2 } = req.query;

    if (!desde1 || !hasta1 || !desde2 || !hasta2) {
      return res.status(400).json({
        error: 'Se requieren: desde1, hasta1, desde2, hasta2 (formato YYYY-MM-DD)',
      });
    }

    const [ordersA, ordersB] = await Promise.all([
      prisma.order.findMany({
        where: { fecha: { gte: new Date(desde1), lte: new Date(hasta1) } },
      }),
      prisma.order.findMany({
        where: { fecha: { gte: new Date(desde2), lte: new Date(hasta2) } },
      }),
    ]);

    const kilosA = ordersA.reduce((sum, o) => sum + o.kilos, 0);
    const kilosB = ordersB.reduce((sum, o) => sum + o.kilos, 0);

    let variacion = 0;
    if (kilosA > 0) {
      variacion = ((kilosB - kilosA) / kilosA) * 100;
    }

    // Estimación de producción: si kilosA es temporada alta, producir un 10% más
    const estimacion_produccion = kilosA > 0 ? Math.ceil(kilosA * 1.1) : null;

    res.json({
      rango_a: { desde: desde1, hasta: hasta1, kilos: kilosA, pedidos: ordersA.length },
      rango_b: { desde: desde2, hasta: hasta2, kilos: kilosB, pedidos: ordersB.length },
      variacion_porcentaje: parseFloat(variacion.toFixed(2)),
      estimacion_produccion,
    });
  } catch (error) {
    console.error('Error compareRanges:', error);
    res.status(500).json({ error: 'Error al comparar rangos' });
  }
};

module.exports = { getSummary, compareRanges };
