const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/produccion
// Devuelve lotes (historial de cargas), stock disponible y totales del mes
const getAll = async (req, res) => {
  try {
    const now       = new Date();
    const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);

    const [lotes, totCargado, totVendido, mesCargado, mesVendido] = await Promise.all([
      prisma.loteProduccion.findMany({
        include: { user: { select: { id: true, name: true } } },
        orderBy: { fecha: 'desc' },
      }),
      prisma.loteProduccion.aggregate({ _sum: { kilos: true } }),
      prisma.order.aggregate({ _sum: { kilos: true } }),
      prisma.loteProduccion.aggregate({
        where:  { fecha: { gte: mesInicio } },
        _sum:   { kilos: true },
      }),
      prisma.order.aggregate({
        where:  { fecha: { gte: mesInicio } },
        _sum:   { kilos: true },
      }),
    ]);

    const kilos_cargados_total = totCargado._sum.kilos || 0;
    const kilos_vendidos_total = totVendido._sum.kilos || 0;

    res.json({
      lotes,
      stock: {
        disponible:           Math.max(0, kilos_cargados_total - kilos_vendidos_total),
        kilos_cargados_total,
        kilos_vendidos_total,
      },
      mes: {
        kilos_cargados: mesCargado._sum.kilos || 0,
        kilos_vendidos: mesVendido._sum.kilos || 0,
      },
    });
  } catch (err) {
    console.error('Error getAll lotes:', err);
    res.status(500).json({ error: 'Error al obtener producción' });
  }
};

// POST /api/produccion — registrar carga a congeladora
const create = async (req, res) => {
  try {
    const { kilos, horas_produccion, notas } = req.body;

    if (!kilos || parseFloat(kilos) <= 0) {
      return res.status(400).json({ error: 'Los kilos son requeridos' });
    }

    const lote = await prisma.loteProduccion.create({
      data: {
        kilos:            parseFloat(kilos),
        horas_produccion: horas_produccion ? parseInt(horas_produccion) : 15,
        notas:            notas || null,
        creado_por:       req.user.id,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json(lote);
  } catch (err) {
    console.error('Error create lote:', err);
    res.status(500).json({ error: 'Error al registrar carga' });
  }
};

// PUT /api/produccion/:id — corregir kilos o notas si fue un error
const update = async (req, res) => {
  try {
    const { id }                             = req.params;
    const { kilos, horas_produccion, notas } = req.body;

    const existing = await prisma.loteProduccion.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return res.status(404).json({ error: 'Carga no encontrada' });

    const lote = await prisma.loteProduccion.update({
      where: { id: parseInt(id) },
      data: {
        ...(kilos            !== undefined && { kilos:            parseFloat(kilos) }),
        ...(horas_produccion !== undefined && { horas_produccion: parseInt(horas_produccion) }),
        ...(notas            !== undefined && { notas }),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.json(lote);
  } catch (err) {
    console.error('Error update lote:', err);
    res.status(500).json({ error: 'Error al actualizar carga' });
  }
};

// DELETE /api/produccion/:id
const remove = async (req, res) => {
  try {
    await prisma.loteProduccion.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Carga eliminada' });
  } catch (err) {
    console.error('Error delete lote:', err);
    res.status(500).json({ error: 'Error al eliminar carga' });
  }
};

module.exports = { getAll, create, update, remove };
