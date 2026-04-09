const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SUPERMASTER_EMAIL = 'yoryet.danoun@gmail.com';

const getAll = async (req, res) => {
  try {
    const { q } = req.query;

    const where = {
      deleted_at: null, // excluir soft-deleted
      ...(q
        ? {
            OR: [
              { nombre:    { contains: q, mode: 'insensitive' } },
              { direccion: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const businesses = await prisma.business.findMany({
      where,
      include: {
        visit_logs:        { orderBy: { fecha: 'desc' }, take: 1 },
        orders:            { orderBy: { fecha: 'desc' }, take: 1 },
        user:              { select: { id: true, name: true } },
        whatsapp_contacts: { orderBy: { fecha: 'desc' }, take: 1 },
      },
      orderBy: { updated_at: 'desc' },
    });

    const result = businesses.map((b) => {
      const lastOrder = b.orders[0];
      let proxima_visita = null;
      if (lastOrder) {
        const fecha = new Date(lastOrder.fecha);
        fecha.setDate(fecha.getDate() + 4);
        proxima_visita = fecha.toISOString();
      }
      return {
        ...b,
        ultima_visita:    b.visit_logs[0]?.fecha        || null,
        ultimos_kilos:    lastOrder?.kilos               || null,
        proxima_visita,
        ultimo_whatsapp:  b.whatsapp_contacts[0]?.fecha || null,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error getAll businesses:', error);
    res.status(500).json({ error: 'Error al obtener negocios' });
  }
};

const getOne = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await prisma.business.findUnique({
      where: { id: parseInt(id) },
      include: {
        user:       { select: { id: true, name: true } },
        visit_logs: {
          orderBy: { fecha: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        orders: {
          orderBy: { fecha: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        whatsapp_contacts: {
          orderBy: { fecha: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const lastOrder = business.orders[0];
    let proxima_visita = null;
    if (lastOrder) {
      const fecha = new Date(lastOrder.fecha);
      fecha.setDate(fecha.getDate() + 4);
      proxima_visita = fecha.toISOString();
    }

    res.json({ ...business, proxima_visita });
  } catch (error) {
    console.error('Error getOne business:', error);
    res.status(500).json({ error: 'Error al obtener negocio' });
  }
};

// Negocios eliminados con sus pedidos (para reasignar kg)
const getOrphaned = async (req, res) => {
  try {
    const deletedBusinesses = await prisma.business.findMany({
      where:   { deleted_at: { not: null } },
      include: { orders: { orderBy: { fecha: 'desc' } } },
      orderBy: { deleted_at: 'desc' },
    });

    const result = deletedBusinesses.map((b) => ({
      business: {
        id:                b.id,
        nombre:            b.nombre,
        deleted_at:        b.deleted_at,
        deleted_by_email:  b.deleted_by_email,
        kilos_al_eliminar: b.kilos_al_eliminar,
      },
      orders:      b.orders,
      total_kilos: b.orders.reduce((s, o) => s + o.kilos, 0),
    }));

    res.json({ orphaned: result });
  } catch (error) {
    console.error('Error getOrphaned:', error);
    res.status(500).json({ error: 'Error al obtener negocios eliminados' });
  }
};

const create = async (req, res) => {
  try {
    const { nombre, direccion, persona_cargo, telefono, lat, lng } = req.body;

    if (!nombre || !direccion || !telefono) {
      return res.status(400).json({ error: 'Nombre, dirección y teléfono son requeridos' });
    }

    const business = await prisma.business.create({
      data: {
        nombre,
        direccion,
        persona_cargo: persona_cargo || null,
        telefono,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        creado_por: req.user.id,
      },
    });

    res.status(201).json(business);
  } catch (error) {
    console.error('Error create business:', error);
    res.status(500).json({ error: 'Error al crear negocio' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, direccion, persona_cargo, telefono, lat, lng, estado_visita } = req.body;

    const existing = await prisma.business.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Negocio no encontrado' });
    if (existing.deleted_at) return res.status(400).json({ error: 'No se puede editar un negocio eliminado' });

    const business = await prisma.business.update({
      where: { id: parseInt(id) },
      data: {
        ...(nombre        &&              { nombre }),
        ...(direccion     &&              { direccion }),
        ...(persona_cargo !== undefined && { persona_cargo }),
        ...(telefono      &&              { telefono }),
        ...(lat           !== undefined && { lat: lat ? parseFloat(lat) : null }),
        ...(lng           !== undefined && { lng: lng ? parseFloat(lng) : null }),
        ...(estado_visita &&              { estado_visita }),
      },
    });

    res.json(business);
  } catch (error) {
    console.error('Error update business:', error);
    res.status(500).json({ error: 'Error al actualizar negocio' });
  }
};

// Soft-delete — solo supermaster (yoryet.danoun@gmail.com)
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.email !== SUPERMASTER_EMAIL) {
      return res.status(403).json({ error: 'Solo el administrador principal puede eliminar negocios' });
    }

    const existing = await prisma.business.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Negocio no encontrado' });
    if (existing.deleted_at) return res.status(400).json({ error: 'El negocio ya estaba eliminado' });

    // Calcular total kg vendidos a este negocio
    const { _sum } = await prisma.order.aggregate({
      where: { business_id: parseInt(id) },
      _sum:  { kilos: true },
    });

    const business = await prisma.business.update({
      where: { id: parseInt(id) },
      data: {
        deleted_at:        new Date(),
        deleted_by_email:  req.user.email,
        kilos_al_eliminar: _sum.kilos || 0,
      },
    });

    res.json({
      message:           'Negocio eliminado',
      deleted_at:        business.deleted_at,
      kilos_al_eliminar: business.kilos_al_eliminar,
    });
  } catch (error) {
    console.error('Error remove business:', error);
    res.status(500).json({ error: 'Error al eliminar negocio' });
  }
};

const getUpcoming = async (req, res) => {
  try {
    const days  = parseInt(req.query.days) || 7;
    const today = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + days);

    const businesses = await prisma.business.findMany({
      where:   { deleted_at: null },
      include: {
        orders:     { orderBy: { fecha: 'desc' }, take: 1 },
        visit_logs: { orderBy: { fecha: 'desc' }, take: 1 },
      },
    });

    const upcoming = businesses
      .map((b) => {
        const lastOrder = b.orders[0];
        if (!lastOrder) return null;
        const fecha = new Date(lastOrder.fecha);
        fecha.setDate(fecha.getDate() + 4);
        return {
          id: b.id, nombre: b.nombre, direccion: b.direccion, telefono: b.telefono,
          ultima_compra: lastOrder.fecha, ultimos_kilos: lastOrder.kilos,
          proxima_visita: fecha.toISOString(), estado_visita: b.estado_visita,
        };
      })
      .filter((b) => {
        if (!b) return false;
        const pv = new Date(b.proxima_visita);
        return pv >= today && pv <= limit;
      })
      .sort((a, b) => new Date(a.proxima_visita) - new Date(b.proxima_visita));

    res.json(upcoming);
  } catch (error) {
    console.error('Error getUpcoming:', error);
    res.status(500).json({ error: 'Error al obtener próximas visitas' });
  }
};

module.exports = { getAll, getOne, getOrphaned, create, update, remove, getUpcoming };
