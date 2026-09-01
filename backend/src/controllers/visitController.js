const prisma = require('../lib/prisma');

const getByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const visits = await prisma.visitLog.findMany({
      where: { business_id: parseInt(businessId) },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { fecha: 'desc' },
    });
    res.json(visits);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener visitas' });
  }
};

const create = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { tipo, comentario, fecha } = req.body;

    if (!tipo) {
      return res.status(400).json({ error: 'El tipo de visita es requerido' });
    }

    const validTypes = ['visita_sin_venta', 'visita_con_venta'];
    if (!validTypes.includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de visita inválido' });
    }

    const business = await prisma.business.findUnique({
      where: { id: parseInt(businessId) },
    });
    if (!business) {
      return res.status(404).json({ error: 'Negocio no encontrado' });
    }

    const visit = await prisma.visitLog.create({
      data: {
        business_id: parseInt(businessId),
        user_id: req.user.id,
        tipo,
        comentario: comentario || null,
        fecha: fecha ? new Date(fecha) : new Date(),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Actualizar estado_visita del negocio
    const newEstado =
      tipo === 'visita_con_venta' ? 'cliente_activo' : 'visitado_sin_venta';
    await prisma.business.update({
      where: { id: parseInt(businessId) },
      data: { estado_visita: newEstado },
    });

    res.status(201).json(visit);
  } catch (error) {
    console.error('Error create visit:', error);
    res.status(500).json({ error: 'Error al crear visita' });
  }
};

module.exports = { getByBusiness, create };
