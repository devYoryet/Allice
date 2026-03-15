-- Agregar campos de precio a Order
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "precio_kg"    DOUBLE PRECISION NOT NULL DEFAULT 400,
  ADD COLUMN IF NOT EXISTS "con_iva"      BOOLEAN          NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "monto_neto"   DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "monto_total"  DOUBLE PRECISION;

-- Calcular montos para pedidos existentes
UPDATE "Order"
SET
  "monto_neto"  = "kilos" * "precio_kg",
  "monto_total" = CASE
    WHEN "estado_factura" = 'facturado' THEN ROUND(("kilos" * "precio_kg" * 1.19)::numeric, 0)
    ELSE "kilos" * "precio_kg"
  END,
  "con_iva" = CASE WHEN "estado_factura" = 'facturado' THEN true ELSE false END
WHERE "monto_neto" IS NULL;

-- Crear tabla LoteProduccion
CREATE TABLE IF NOT EXISTS "LoteProduccion" (
    "id"               SERIAL           NOT NULL,
    "fecha_inicio"     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kg_programados"   DOUBLE PRECISION NOT NULL,
    "kg_producidos"    DOUBLE PRECISION,
    "bolsas"           INTEGER,
    "estado"           TEXT             NOT NULL DEFAULT 'produciendo',
    "horas_congelado"  INTEGER          NOT NULL DEFAULT 12,
    "fecha_disponible" TIMESTAMP(3),
    "notas"            TEXT,
    "creado_por"       INTEGER          NOT NULL,
    "created_at"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoteProduccion_pkey" PRIMARY KEY ("id")
);

-- FK de LoteProduccion a User
ALTER TABLE "LoteProduccion"
  ADD CONSTRAINT "LoteProduccion_creado_por_fkey"
  FOREIGN KEY ("creado_por") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
