/**
 * Traduce errores de Prisma a mensajes accionables.
 *
 * Hasta ahora cualquier fallo se devolvía como 500 "Error al registrar carga",
 * lo que dejaba al usuario sin saber qué pasó (el caso de los 200 kg que no
 * entraban). Estos códigos distinguen un problema de datos de un problema de
 * esquema, que se arregla con `npm run repair:schema`.
 */

// Códigos que indican que la base no coincide con schema.prisma
const SCHEMA_CODES = new Set([
  'P2021', // la tabla no existe
  'P2022', // la columna no existe
  'P2011', // violación de NOT NULL (columna legacy que Prisma ya no envía)
]);

const MENSAJE_ESQUEMA =
  'La base de datos tiene el esquema desactualizado. Ejecuta las migraciones ' +
  'pendientes (npm run repair:schema) y vuelve a intentar.';

function describePrismaError(error, fallback) {
  if (error && SCHEMA_CODES.has(error.code)) {
    return { status: 503, error: MENSAJE_ESQUEMA, code: error.code };
  }
  if (error && error.code === 'P2003') {
    return { status: 409, error: 'Referencia inválida: el registro relacionado no existe.', code: error.code };
  }
  if (error && error.code === 'P2025') {
    return { status: 404, error: 'El registro no existe o ya fue eliminado.', code: error.code };
  }
  // Sin conexión / pool agotado
  if (error && (error.code === 'P1001' || error.code === 'P1008' || error.code === 'P2024')) {
    return { status: 503, error: 'No se pudo conectar con la base de datos. Intenta de nuevo.', code: error.code };
  }
  return { status: 500, error: fallback, code: error?.code };
}

/** Responde el error ya traducido y lo deja en el log del servidor. */
function sendPrismaError(res, error, fallback, contexto) {
  console.error(`${contexto}:`, error);
  const { status, error: mensaje, code } = describePrismaError(error, fallback);
  res.status(status).json({ error: mensaje, ...(code ? { code } : {}) });
}

module.exports = { describePrismaError, sendPrismaError };
