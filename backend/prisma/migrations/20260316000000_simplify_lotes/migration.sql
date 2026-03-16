-- Simplify LoteProduccion: remove complex state machine, track real freezer loads only

-- Step 1: Drop old columns
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "kg_programados";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "kg_producidos";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "bolsas";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "estado";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "horas_congelado";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "fecha_disponible";
ALTER TABLE "LoteProduccion" DROP COLUMN IF EXISTS "updated_at";

-- Step 2: Rename fecha_inicio → fecha (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'LoteProduccion' AND column_name = 'fecha_inicio'
  ) THEN
    ALTER TABLE "LoteProduccion" RENAME COLUMN "fecha_inicio" TO "fecha";
  END IF;
END$$;

-- Step 3: Add new columns
ALTER TABLE "LoteProduccion" ADD COLUMN IF NOT EXISTS "kilos" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "LoteProduccion" ADD COLUMN IF NOT EXISTS "horas_produccion" INTEGER NOT NULL DEFAULT 15;
