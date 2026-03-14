const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getAll = async (req, res) => {
  try {
    const { q } = req.query;
    const where = q
      ? {
          OR: [
            { nombre: { contains: q } },
            { direccion: { contains: q } },
          ],
        }
      : {};

    const businesses = await prisma.business.findMany({
      where,
      include: {
        visit_logs: {
          orderBy: { fecha: 'desc' },
          take: 1,
        },
        orders: {
          orderBy: { fecha: 'desc' },
          take: 1,
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { updated_at: 'desc' },
    });

    // Calcular próxima visita sugerida
    const result = businesses.map((b) => {
      const lastOrder = b.orders[0];
      let proxima_visita = null;
      if (lastOrder) {
        const fecha = new Date(lastOrder.fecha);
        fecha.setDate(fecha.getDate() + 4); // 4 días promedio (rango 3-5)
        proxima_visita = fecha.toISOString();
      }
      return {
        ...b,
        ultima_visita: b.visit_logs[0]?.fecha || null,
        ultimos_kilos: lastOrder?.kilos || null,
        proxima_visita,
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
        user: { select: { id: true, name: true } },
        visit_logs: {
          orderBy: { fecha: 'desc' },
          include: { user: { select: { id: true, name: true } } },
        },
        orders: {
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
    if (!existing) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const business = await prisma.business.update({
      where: { id: parseInt(id) },
      data: {
        ...(nombre && { nombre }),
        ...(direccion && { direccion }),
        ...(persona_cargo !== undefined && { persona_cargo }),
        ...(telefono && { telefono }),
        ...(lat !== undefined && { lat: lat ? parseFloat(lat) : null }),
        ...(lng !== undefined && { lng: lng ? parseFloat(lng) : null }),
        ...(estado_visita && { estado_visita }),
      },
    });

    res.json(business);
  } catch (error) {
    console.error('Error update business:', error);
    res.status(500).json({ error: 'Error al actualizar negocio' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.business.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Negocio eliminado' });
  } catch (error) {
    console.error('Error delete business:', error);
    res.status(500).json({ error: 'Error al eliminar negocio' });
  }
};

// Negocios que deberían visitarse hoy o en los próximos X días
const getUpcoming = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const today = new Date();
    const limit = new Date();
    limit.setDate(limit.getDate() + days);

    const businesses = await prisma.business.findMany({
      include: {
        orders: { orderBy: { fecha: 'desc' }, take: 1 },
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
          id: b.id,
          nombre: b.nombre,
          direccion: b.direccion,
          telefono: b.telefono,
          ultima_compra: lastOrder.fecha,
          ultimos_kilos: lastOrder.kilos,
          proxima_visita: fecha.toISOString(),
          estado_visita: b.estado_visita,
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

module.exports = { getAll, getOne, create, update, remove, getUpcoming };
