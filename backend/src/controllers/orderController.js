const prisma = require('../lib/prisma');

const getByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const orders = await prisma.order.findMany({
      where:   { business_id: parseInt(businessId) },
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
    // ?open=1 → solo el período actual (cierre_id IS NULL)
    // Siempre excluir pedidos de negocios eliminados
    const where = {
      business: { deleted_at: null },
      ...(req.query.open === '1' ? { cierre_id: null } : {}),
    };
    const orders = await prisma.order.findMany({
      where,
      include: {
        // Incluir lat/lng para que el dashboard pueda armar el link de Waze
        business: { select: { id: true, nombre: true, lat: true, lng: true, direccion: true } },
        user:     { select: { id: true, name: true } },
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

    const kg         = parseFloat(kilos);
    const precioKg   = req.body.precio_kg ? parseFloat(req.body.precio_kg) : 400;
    const conIva     = req.body.con_iva === true || req.body.con_iva === 'true';
    const origen     = req.body.origen || 'presencial'; // presencial | whatsapp
    const montoNeto  = Math.round(kg * precioKg);
    const montoTotal = conIva ? Math.round(montoNeto * 1.19) : montoNeto;

    const order = await prisma.order.create({
      data: {
        business_id:    parseInt(businessId),
        user_id:        req.user.id,
        kilos:          kg,
        precio_kg:      precioKg,
        con_iva:        conIva,
        monto_neto:     montoNeto,
        monto_total:    montoTotal,
        estado_pedido:  'pendiente',
        estado_pago:    'pendiente',
        estado_factura: conIva ? 'facturado' : 'sin_factura',
        origen,
        comentario:     comentario || null,
        fecha:          fecha ? new Date(fecha) : new Date(),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Actualizar estado_visita del negocio a cliente_activo
    await prisma.business.update({
      where: { id: parseInt(businessId) },
      data:  { estado_visita: 'cliente_activo' },
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
    const { estado_pedido, estado_pago, estado_factura, comentario, kilos, business_id } = req.body;

    const existing = await prisma.order.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Si cambian los kilos, el precio o el IVA hay que rehacer los montos:
    // antes solo se guardaban los kilos nuevos y monto_neto/monto_total
    // quedaban con el valor viejo, descuadrando reportes, cobros y cierres.
    const { precio_kg, con_iva } = req.body;
    const montos = {};
    if (kilos !== undefined || precio_kg !== undefined || con_iva !== undefined) {
      const kg       = kilos     !== undefined ? parseFloat(kilos)     : existing.kilos;
      const precio   = precio_kg !== undefined ? parseFloat(precio_kg) : existing.precio_kg;
      const conIva   = con_iva   !== undefined ? (con_iva === true || con_iva === 'true') : existing.con_iva;

      if (Number.isFinite(kg) && kg > 0 && Number.isFinite(precio) && precio > 0) {
        montos.kilos       = kg;
        montos.precio_kg   = precio;
        montos.con_iva     = conIva;
        montos.monto_neto  = Math.round(kg * precio);
        montos.monto_total = conIva ? Math.round(kg * precio * 1.19) : Math.round(kg * precio);
      } else {
        return res.status(400).json({ error: 'Kilos y precio por kilo deben ser mayores a 0' });
      }
    }

    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: {
        ...(estado_pedido  &&              { estado_pedido }),
        ...(estado_pago    &&              { estado_pago }),
        ...(estado_factura &&              { estado_factura }),
        ...(comentario     !== undefined && { comentario }),
        ...(business_id    &&              { business_id: parseInt(business_id) }),
        ...montos,
      },
      include: {
        business: { select: { id: true, nombre: true, lat: true, lng: true, direccion: true } },
        user:     { select: { id: true, name: true } },
      },
    });

    res.json(order);
  } catch (error) {
    console.error('Error update order:', error);
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
};

module.exports = { getByBusiness, getAll, create, update };
