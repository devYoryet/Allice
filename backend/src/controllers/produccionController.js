const prisma = require('../lib/prisma');
const { sendPrismaError } = require('../lib/prismaErrors');

// Tope por carga: la máquina no da más de 2.800 kg/día (24 h), se deja 3.000
// como margen. Debe coincidir con el máximo del modal de ProduccionPage.
const MAX_KILOS_POR_CARGA = 3000;
const HORAS_VALIDAS       = [15, 24];

// Solo cuentan como "vendido" los pedidos de negocios vigentes: los de negocios
// eliminados (soft-delete) ya no descuentan del stock de la congeladora.
const VENTAS_VIGENTES = { business: { deleted_at: null } };

/**
 * Valida y normaliza los kilos recibidos.
 * Devuelve { kilos } o { error } con el motivo exacto del rechazo.
 */
function parseKilos(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return { error: 'Ingresa los kilos cargados.' };
  }
  const kilos = Number(valor);
  if (!Number.isFinite(kilos)) {
    return { error: 'Los kilos deben ser un número (usa punto para los decimales).' };
  }
  if (kilos <= 0) {
    return { error: 'Los kilos deben ser mayores a 0.' };
  }
  if (kilos > MAX_KILOS_POR_CARGA) {
    return { error: `Máximo ${MAX_KILOS_POR_CARGA.toLocaleString('es-CL')} kg por carga.` };
  }
  // Se guarda con 2 decimales para evitar arrastrar errores de coma flotante.
  return { kilos: Math.round(kilos * 100) / 100 };
}

function parseHoras(valor) {
  if (valor === undefined || valor === null || valor === '') return { horas: 15 };
  const horas = Number.parseInt(valor, 10);
  if (!HORAS_VALIDAS.includes(horas)) {
    return { error: `Las horas de producción deben ser ${HORAS_VALIDAS.join(' o ')}.` };
  }
  return { horas };
}

// GET /api/produccion
// Devuelve lotes (historial de cargas), stock disponible y totales del mes
const getAll = async (req, res) => {
  try {
    const now       = new Date();
    const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1);

    // El stock solo puede calcularse desde que se empezó a registrar cargas.
    // Antes de la primera carga la app no sabe qué entró a la congeladora, así
    // que restar esas ventas da un número inventado: es lo que hacía aparecer
    // 72 kg de stock cuando se habían cargado 800 kg y las 728 kg vendidas eran
    // de meses anteriores, cuando registrar cargas estaba roto.
    //
    // Se exige kilos > 0 porque las bases que venían del esquema viejo tienen
    // filas huérfanas de 0 kg (la columna `kilos` se añadió con DEFAULT 0).
    // Una carga de 0 kg no aporta inventario, pero su fecha antigua arrastraba
    // el inicio del cálculo meses atrás y volvía a descontar todas las ventas.
    const primeraCarga = await prisma.loteProduccion.findFirst({
      where:   { kilos: { gt: 0 } },
      orderBy: { fecha: 'asc' },
      select:  { fecha: true },
    });
    const desde = primeraCarga?.fecha || null;
    const ventasDelInventario = desde
      ? { ...VENTAS_VIGENTES, fecha: { gte: desde } }
      : VENTAS_VIGENTES;

    const [lotes, totCargado, totVendido, ventasPrevias, mesCargado, mesVendido] = await Promise.all([
      prisma.loteProduccion.findMany({
        include: { user: { select: { id: true, name: true } } },
        orderBy: { fecha: 'desc' },
      }),
      prisma.loteProduccion.aggregate({ _sum: { kilos: true } }),
      prisma.order.aggregate({ where: ventasDelInventario, _sum: { kilos: true } }),
      // Ventas anteriores a la primera carga: no descuentan stock, pero se
      // informan para que el número no parezca salido de la nada.
      desde
        ? prisma.order.aggregate({
            where: { ...VENTAS_VIGENTES, fecha: { lt: desde } },
            _sum:  { kilos: true },
          })
        : Promise.resolve({ _sum: { kilos: 0 } }),
      prisma.loteProduccion.aggregate({
        where:  { fecha: { gte: mesInicio } },
        _sum:   { kilos: true },
      }),
      prisma.order.aggregate({
        where:  { ...VENTAS_VIGENTES, fecha: { gte: mesInicio } },
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
        // Desde cuándo se cuenta el inventario, y qué quedó fuera del cálculo.
        desde,
        kilos_vendidos_antes: ventasPrevias._sum.kilos || 0,
      },
      mes: {
        kilos_cargados: mesCargado._sum.kilos || 0,
        kilos_vendidos: mesVendido._sum.kilos || 0,
      },
    });
  } catch (err) {
    sendPrismaError(res, err, 'Error al obtener producción', 'Error getAll lotes');
  }
};

// POST /api/produccion — registrar carga a congeladora
const create = async (req, res) => {
  const { kilos, error: errorKilos } = parseKilos(req.body.kilos);
  if (errorKilos) return res.status(400).json({ error: errorKilos });

  const { horas, error: errorHoras } = parseHoras(req.body.horas_produccion);
  if (errorHoras) return res.status(400).json({ error: errorHoras });

  try {
    const lote = await prisma.loteProduccion.create({
      data: {
        kilos,
        horas_produccion: horas,
        notas:            req.body.notas || null,
        creado_por:       req.user.id,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json(lote);
  } catch (err) {
    sendPrismaError(res, err, 'Error al registrar carga', 'Error create lote');
  }
};

// PUT /api/produccion/:id — corregir kilos o notas si fue un error
const update = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador de carga inválido' });

  const data = {};

  if (req.body.kilos !== undefined) {
    const { kilos, error } = parseKilos(req.body.kilos);
    if (error) return res.status(400).json({ error });
    data.kilos = kilos;
  }

  if (req.body.horas_produccion !== undefined) {
    const { horas, error } = parseHoras(req.body.horas_produccion);
    if (error) return res.status(400).json({ error });
    data.horas_produccion = horas;
  }

  if (req.body.notas !== undefined) data.notas = req.body.notas || null;

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ error: 'No hay cambios que guardar' });
  }

  try {
    const existing = await prisma.loteProduccion.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Carga no encontrada' });

    const lote = await prisma.loteProduccion.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true } } },
    });

    res.json(lote);
  } catch (err) {
    sendPrismaError(res, err, 'Error al actualizar carga', 'Error update lote');
  }
};

// DELETE /api/produccion/:id
const remove = async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Identificador de carga inválido' });

  try {
    await prisma.loteProduccion.delete({ where: { id } });
    res.json({ message: 'Carga eliminada' });
  } catch (err) {
    sendPrismaError(res, err, 'Error al eliminar carga', 'Error delete lote');
  }
};

module.exports = { getAll, create, update, remove, MAX_KILOS_POR_CARGA };
