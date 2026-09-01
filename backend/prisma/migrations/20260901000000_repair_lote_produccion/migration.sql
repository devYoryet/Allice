-- ============================================================================
-- REPARACIÓN DE "LoteProduccion"
--
-- Motivo: la migración 20260315000000_add_produccion_pricing crea la tabla con
-- CREATE TABLE IF NOT EXISTS pero añade la FK con un ALTER TABLE ADD CONSTRAINT
-- sin guarda. Si esa migración se reintenta sobre una base que ya tenía la
-- tabla, el ADD CONSTRAINT aborta con "constraint already exists", la migración
-- queda en estado failed y 20260316000000_simplify_lotes NUNCA se aplica.
--
-- Consecuencia en producción: "LoteProduccion" conserva las columnas legacy
-- (kg_programados NOT NULL, estado NOT NULL, horas_congelado NOT NULL,
-- updated_at NOT NULL) que Prisma ya no envía. Todo INSERT falla con
-- "null value in column ... violates not-null constraint" y el backend lo
-- devuelve como 500 "Error al registrar carga": es el motivo por el que no se
-- pudieron cargar los 200 kg de stock.
--
-- Esta migración es 100 % idempotente: se puede correr sobre una base sana
-- (no hace nada) o sobre una base con el esquema viejo (la normaliza).
-- ============================================================================

-- 1. La tabla debe existir, aunque simplify_lotes nunca haya corrido.
CREATE TABLE IF NOT EXISTS "LoteProduccion" (
    "id"         SERIAL       NOT NULL,
    "creado_por" INTEGER      NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoteProduccion_pkey" PRIMARY KEY ("id")
);

-- 2. fecha_inicio → fecha (solo si quedó el nombre viejo y no existe ya el nuevo).
DO $repair$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'LoteProduccion' AND column_name = 'fecha_inicio'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'LoteProduccion' AND column_name = 'fecha'
  ) THEN
    ALTER TABLE "LoteProduccion" RENAME COLUMN "fecha_inicio" TO "fecha";
  END IF;
END
$repair$;

-- 3. Columnas del modelo actual.
ALTER TABLE "LoteProduccion" ADD COLUMN IF NOT EXISTS "kilos"            DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "LoteProduccion" ADD COLUMN IF NOT EXISTS "horas_produccion" INTEGER          NOT NULL DEFAULT 15;
ALTER TABLE "LoteProduccion" ADD COLUMN IF NOT EXISTS "fecha"            TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "LoteProduccion" ADD COLUMN IF NOT EXISTS "notas"            TEXT;
ALTER TABLE "LoteProduccion" ADD COLUMN IF NOT EXISTS "created_at"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 4. Rescatar los kilos de las columnas legacy antes de eliminarlas,
--    para no perder cargas registradas con el esquema viejo.
DO $repair$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'LoteProduccion' AND column_name = 'kg_producidos'
  ) THEN
    EXECUTE 'UPDATE "LoteProduccion" SET "kilos" = "kg_producidos"
             WHERE ("kilos" IS NULL OR "kilos" = 0) AND "kg_producidos" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'LoteProduccion' AND column_name = 'kg_programados'
  ) THEN
    EXECUTE 'UPDATE "LoteProduccion" SET "kilos" = "kg_programados"
             WHERE ("kilos" IS NULL OR "kilos" = 0) AND "kg_programados" IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'LoteProduccion' AND column_name = 'horas_congelado'
  ) THEN
    EXECUTE 'UPDATE "LoteProduccion" SET "horas_produccion" = "horas_congelado"
             WHERE "horas_congelado" IS NOT NULL';
  END IF;
END
$repair$;

-- 4b. kilos se añade con DEFAULT 0 solo para poder crearla sobre filas ya
--     existentes; el modelo la declara obligatoria, así que se quita el default
--     para que la base y schema.prisma queden idénticos.
ALTER TABLE "LoteProduccion" ALTER COLUMN "kilos" DROP DEFAULT;

-- 5. Eliminar las columnas legacy NOT NULL que rompen el INSERT.
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "kg_programados";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "kg_producidos";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "bolsas";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "estado";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "horas_congelado";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "fecha_disponible";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "updated_at";

-- 6. FK a User, de forma idempotente (DROP IF EXISTS + ADD, no hay ADD IF NOT EXISTS).
ALTER TABLE "LoteProduccion" DROP CONSTRAINT IF EXISTS "LoteProduccion_creado_por_fkey";
ALTER TABLE "LoteProduccion"
  ADD CONSTRAINT "LoteProduccion_creado_por_fkey"
  FOREIGN KEY ("creado_por") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Índice para el historial (orderBy fecha desc).
CREATE INDEX IF NOT EXISTS "LoteProduccion_fecha_idx" ON "LoteProduccion"("fecha" DESC);
