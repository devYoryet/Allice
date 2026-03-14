const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const orders = await prisma.order.findMany({
      where: { business_id: parseInt(businessId) },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { fecha: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

const getAll = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        business: { select: { id: true, nombre: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { fecha: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

const create = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { kilos, comentario, fecha } = req.body;

    if (!kilos || parseFloat(kilos) <= 0) {
      return res.status(400).json({ error: 'Los kilos son requeridos y deben ser mayores a 0' });
    }

    const business = await prisma.business.findUnique({
      where: { id: parseInt(businessId) },
    });
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const order = await prisma.order.create({
      data: {
        business_id: parseInt(businessId),
        user_id: req.user.id,
        kilos: parseFloat(kilos),
        estado_pedido: 'pendiente',
        estado_pago: 'pendiente',
        estado_factura: 'sin_factura',
        comentario: comentario || null,
        fecha: fecha ? new Date(fecha) : new Date(),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Actualizar estado_visita del negocio a cliente_activo
    await prisma.business.update({
      where: { id: parseInt(businessId) },
      data: { estado_visita: 'cliente_activo' },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error create order:', error);
    res.status(500).json({ error: 'Error al crear pedido' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado_pedido, estado_pago, estado_factura, comentario, kilos } = req.body;

    const existing = await prisma.order.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        ...(estado_pedido && { estado_pedido }),
        ...(estado_pago && { estado_pago }),
        ...(estado_factura && { estado_factura }),
        ...(comentario !== undefined && { comentario }),
        ...(kilos && { kilos: parseFloat(kilos) }),
      },
      include: {
        business: { select: { id: true, nombre: true } },
        user: { select: { id: true, name: true } },
      },
    });

    res.json(order);
  } catch (error) {
    console.error('Error update order:', error);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
};

module.exports = { getByBusiness, getAll, create, update };
