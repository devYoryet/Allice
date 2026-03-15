const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// GET /api/produccion  — todos los lotes, más recientes primero
const getAll = async (req, res) => {
  try {
    const lotes = await prisma.loteProduccion.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: { fecha_inicio: 'desc' },
    });

    // Actualizar automáticamente lotes en congelando que ya cumplieron el tiempo
    const ahora = new Date();
    const listos = lotes.filter(
      (l) => l.estado === 'congelando' && l.fecha_disponible && new Date(l.fecha_disponible) <= ahora
    );
    if (listos.length > 0) {
      await prisma.loteProduccion.updateMany({
        where: { id: { in: listos.map((l) => l.id) } },
        data: { estado: 'disponible' },
      });
      listos.forEach((l) => { l.estado = 'disponible'; });
    }

    // Resumen de stock
    const stock = {
      produciendo: 0,
      congelando:  0,
      disponible:  0,
    };
    lotes.forEach((l) => {
      const kg = l.kg_producidos ?? l.kg_programados;
      if (l.estado === 'produciendo') stock.produciendo += kg;
      if (l.estado === 'congelando')  stock.congelando  += kg;
      if (l.estado === 'disponible')  stock.disponible  += kg;
    });

    res.json({ lotes, stock });
  } catch (err) {
    console.error('Error getAll lotes:', err);
    res.status(500).json({ error: 'Error al obtener lotes' });
  }
};

// POST /api/produccion  — crear nuevo lote
const create = async (req, res) => {
  try {
    const { kg_programados, bolsas, horas_congelado, notas, fecha_inicio } = req.body;

    if (!kg_programados || parseFloat(kg_programados) <= 0) {
      return res.status(400).json({ error: 'Los kg programados son requeridos' });
    }

    const lote = await prisma.loteProduccion.create({
      data: {
        kg_programados:  parseFloat(kg_programados),
        bolsas:          bolsas ? parseInt(bolsas) : null,
        horas_congelado: horas_congelado ? parseInt(horas_congelado) : 12,
        notas:           notas || null,
        estado:          'produciendo',
        fecha_inicio:    fecha_inicio ? new Date(fecha_inicio) : new Date(),
        creado_por:      req.user.id,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json(lote);
  } catch (err) {
    console.error('Error create lote:', err);
    res.status(500).json({ error: 'Error al crear lote' });
  }
};

// PUT /api/produccion/:id  — avanzar estado o editar lote
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, kg_producidos, bolsas, horas_congelado, notas } = req.body;

    const existing = await prisma.loteProduccion.findUnique({ where: { id: parseInt(id) } });
    if (!existing) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    const data = {};

    if (kg_producidos !== undefined) data.kg_producidos = parseFloat(kg_producidos);
    if (bolsas !== undefined)        data.bolsas        = bolsas ? parseInt(bolsas) : null;
    if (horas_congelado !== undefined) data.horas_congelado = parseInt(horas_congelado);
    if (notas !== undefined)         data.notas         = notas;

    if (estado) {
      data.estado = estado;

      // Al pasar a "congelando", calcular fecha disponible
      if (estado === 'congelando') {
        const horas = horas_congelado ? parseInt(horas_congelado) : existing.horas_congelado;
        const disponible = new Date();
        disponible.setHours(disponible.getHours() + horas);
        data.fecha_disponible = disponible;
      }

      // Al pasar a "disponible" manualmente, limpiar fecha si venía de produciendo
      if (estado === 'disponible' && existing.estado === 'produciendo') {
        data.fecha_disponible = new Date();
      }
    }

    const lote = await prisma.loteProduccion.update({
      where: { id: parseInt(id) },
      data,
      include: { user: { select: { id: true, name: true } } },
    });

    res.json(lote);
  } catch (err) {
    console.error('Error update lote:', err);
    res.status(500).json({ error: 'Error al actualizar lote' });
  }
};

// DELETE /api/produccion/:id
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.loteProduccion.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Lote eliminado' });
  } catch (err) {
    console.error('Error delete lote:', err);
    res.status(500).json({ error: 'Error al eliminar lote' });
  }
};

module.exports = { getAll, create, update, remove };
