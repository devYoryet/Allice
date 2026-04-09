const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/businesses/:businessId/whatsapp — historial de contactos WA
const getByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const contacts = await prisma.whatsAppContact.findMany({
      where:   { business_id: parseInt(businessId) },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { fecha: 'desc' },
    });
    res.json(contacts);
  } catch (error) {
    console.error('Error getByBusiness WA:', error);
    res.status(500).json({ error: 'Error al obtener contactos WhatsApp' });
  }
};

// POST /api/businesses/:businessId/whatsapp — registrar contacto WA
// Si genero_venta = true y pedido_kilos > 0, crea un Order pendiente automáticamente
const create = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { fecha, numero_usado, genero_venta, pedido_kilos, precio_kg, notas } = req.body;

    const business = await prisma.business.findUnique({
      where: { id: parseInt(businessId) },
    });
    if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });

    const result = await prisma.$transaction(async (tx) => {
      // 1. Registrar el contacto WhatsApp
      const contact = await tx.whatsAppContact.create({
        data: {
          business_id:  parseInt(businessId),
          user_id:      req.user.id,
          fecha:        fecha ? new Date(fecha) : new Date(),
          numero_usado: numero_usado || null,
          genero_venta: genero_venta === true || genero_venta === 'true',
          pedido_kilos: pedido_kilos ? parseFloat(pedido_kilos) : null,
          precio_kg:    precio_kg    ? parseFloat(precio_kg)    : null,
          notas:        notas        || null,
        },
        include: { user: { select: { id: true, name: true } } },
      });

      let order = null;

      // 2. Si generó venta con kilos informados, crear Order pendiente
      if (contact.genero_venta && pedido_kilos && parseFloat(pedido_kilos) > 0) {
        const kg        = parseFloat(pedido_kilos);
        const precioKg  = precio_kg ? parseFloat(precio_kg) : 400;
        const montoNeto = Math.round(kg * precioKg);

        order = await tx.order.create({
          data: {
            business_id:   parseInt(businessId),
            user_id:       req.user.id,
            kilos:         kg,
            precio_kg:     precioKg,
            monto_neto:    montoNeto,
            monto_total:   montoNeto,
            estado_pedido: 'pendiente',
            estado_pago:   'pendiente',
            comentario:    `Pedido acordado por WhatsApp${notas ? ' — ' + notas : ''}`,
          },
        });

        // Actualizar estado del negocio a cliente_activo
        await tx.business.update({
          where: { id: parseInt(businessId) },
          data:  { estado_visita: 'cliente_activo' },
        });
      }

      return { contact, order };
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error create WA contact:', error);
    res.status(500).json({ error: 'Error al registrar contacto WhatsApp' });
  }
};

module.exports = { getByBusiness, create };
