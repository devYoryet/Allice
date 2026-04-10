const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// POST /api/cierres — Ejecutar cierre de mes (solo admin)
const createCierre = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden ejecutar el cierre de mes' });
    }

    // Obtener todas las órdenes del período actual (aún no cerradas, excluir negocios eliminados)
    const openOrders = await prisma.order.findMany({
      where: { cierre_id: null, business: { deleted_at: null } },
      include: { business: { select: { id: true, nombre: true } } },
    });

    if (openOrders.length === 0) {
      return res.status(400).json({ error: 'No hay pedidos en el período actual para cerrar' });
    }

    // Calcular totales del período
    const totalKilos  = openOrders.reduce((s, o) => s + o.kilos, 0);
    const totalVentas = openOrders.reduce((s, o) => s + (o.monto_total || o.kilos * 400), 0);
    const totalCobrado = openOrders
      .filter((o) => o.estado_pago === 'pagado')
      .reduce((s, o) => s + (o.monto_total || o.kilos * 400), 0);

    // Agrupar por negocio para el detalle histórico
    const byBusiness = {};
    openOrders.forEach((o) => {
      const key = o.business_id;
      if (!byBusiness[key]) {
        byBusiness[key] = {
          business_id: o.business_id,
          nombre_negocio: o.business?.nombre || `Negocio #${o.business_id}`,
          total_kilos: 0,
          total_ventas: 0,
          total_pedidos: 0,
        };
      }
      byBusiness[key].total_kilos   += o.kilos;
      byBusiness[key].total_ventas  += o.monto_total || o.kilos * 400;
      byBusiness[key].total_pedidos += 1;
    });

    // Determinar nombre del período (mes/año actual)
    const ahora  = new Date();
    const periodo = `${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`;

    // Transacción: crear cierre, detalles y actualizar órdenes
    const cierre = await prisma.$transaction(async (tx) => {
      // 1. Crear el registro de cierre
      const nuevoCierre = await tx.cierreMes.create({
        data: {
          periodo,
          total_kilos:      parseFloat(totalKilos.toFixed(2)),
          total_ventas:     Math.round(totalVentas),
          total_cobrado:    Math.round(totalCobrado),
          ordenes_cerradas: openOrders.length,
          cerrado_por:      req.user.id,
          detalles: {
            create: Object.values(byBusiness).map((b) => ({
              business_id:    b.business_id,
              nombre_negocio: b.nombre_negocio,
              total_kilos:    parseFloat(b.total_kilos.toFixed(2)),
              total_ventas:   Math.round(b.total_ventas),
              total_pedidos:  b.total_pedidos,
            })),
          },
        },
        include: { detalles: true, usuario: { select: { name: true, email: true } } },
      });

      // 2. Marcar todas las órdenes abiertas como entregadas, pagadas y vincularlas al cierre
      await tx.order.updateMany({
        where: { cierre_id: null },
        data: {
          estado_pago:   'pagado',
          estado_pedido: 'entregado',
          cierre_id:     nuevoCierre.id,
        },
      });

      return nuevoCierre;
    });

    res.status(201).json(cierre);
  } catch (error) {
    console.error('Error createCierre:', error);
    res.status(500).json({ error: 'Error al ejecutar el cierre de mes' });
  }
};

// GET /api/cierres — Listar todos los cierres (más reciente primero)
const getCierres = async (req, res) => {
  try {
    const cierres = await prisma.cierreMes.findMany({
      orderBy: { fecha_cierre: 'desc' },
      include: {
        usuario: { select: { name: true } },
        _count: { select: { detalles: true } },
      },
    });
    res.json(cierres);
  } catch (error) {
    console.error('Error getCierres:', error);
    res.status(500).json({ error: 'Error al obtener cierres' });
  }
};

// GET /api/cierres/:id — Detalle de un cierre con desglose por negocio
const getCierreById = async (req, res) => {
  try {
    const { id } = req.params;
    const cierre = await prisma.cierreMes.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario:  { select: { name: true, email: true } },
        detalles: { orderBy: { total_kilos: 'desc' } },
      },
    });
    if (!cierre) return res.status(404).json({ error: 'Cierre no encontrado' });
    res.json(cierre);
  } catch (error) {
    console.error('Error getCierreById:', error);
    res.status(500).json({ error: 'Error al obtener detalle del cierre' });
  }
};

// GET /api/cierres/resumen-actual — Resumen del período actual (aún no cerrado)
const getResumenActual = async (req, res) => {
  try {
    const openOrders = await prisma.order.findMany({
      where: { cierre_id: null, business: { deleted_at: null } },
      include: { business: { select: { id: true, nombre: true } } },
    });

    const totalKilos   = openOrders.reduce((s, o) => s + o.kilos, 0);
    const totalVentas  = openOrders.reduce((s, o) => s + (o.monto_total || o.kilos * 400), 0);
    const totalPagado  = openOrders.filter((o) => o.estado_pago === 'pagado').reduce((s, o) => s + (o.monto_total || o.kilos * 400), 0);
    const totalPendiente = totalVentas - totalPagado;

    // Agrupar por negocio
    const byBusiness = {};
    openOrders.forEach((o) => {
      const key = o.business_id;
      if (!byBusiness[key]) {
        byBusiness[key] = {
          business_id: o.business_id,
          nombre:      o.business?.nombre || `Negocio #${o.business_id}`,
          kilos:       0,
          ventas:      0,
          pedidos:     0,
          pendiente:   0,
        };
      }
      const monto = o.monto_total || o.kilos * 400;
      byBusiness[key].kilos    += o.kilos;
      byBusiness[key].ventas   += monto;
      byBusiness[key].pedidos  += 1;
      if (o.estado_pago === 'pendiente') byBusiness[key].pendiente += monto;
    });

    const ahora  = new Date();
    const periodo = `${MESES[ahora.getMonth()]} ${ahora.getFullYear()}`;

    res.json({
      periodo,
      total_kilos:      parseFloat(totalKilos.toFixed(2)),
      total_ventas:     Math.round(totalVentas),
      total_pagado:     Math.round(totalPagado),
      total_pendiente:  Math.round(totalPendiente),
      ordenes_abiertas: openOrders.length,
      por_negocio:      Object.values(byBusiness).sort((a, b) => b.kilos - a.kilos),
    });
  } catch (error) {
    console.error('Error getResumenActual:', error);
    res.status(500).json({ error: 'Error al obtener resumen actual' });
  }
};

module.exports = { createCierre, getCierres, getCierreById, getResumenActual };
