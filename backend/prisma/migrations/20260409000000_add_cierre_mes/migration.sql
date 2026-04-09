-- Cierre de mes: se realiza el día 9 de cada mes
-- Preserva el histórico de ventas por local y resetea el contador del período actual

-- Tabla principal de cierres
CREATE TABLE "CierreMes" (
  "id"               SERIAL PRIMARY KEY,
  "periodo"          TEXT NOT NULL,              -- ej: "Abril 2026"
  "fecha_cierre"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "total_kilos"      DOUBLE PRECISION NOT NULL,
  "total_ventas"     DOUBLE PRECISION NOT NULL,  -- suma monto_total
  "total_cobrado"    DOUBLE PRECISION NOT NULL,  -- lo ya pagado al cerrar
  "ordenes_cerradas" INTEGER NOT NULL,
  "cerrado_por"      INTEGER NOT NULL,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CierreMes_cerrado_por_fkey" FOREIGN KEY ("cerrado_por")
    REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

-- Detalle por negocio de cada cierre (snapshot histórico)
CREATE TABLE "CierreMesDetalle" (
  "id"             SERIAL PRIMARY KEY,
  "cierre_id"      INTEGER NOT NULL,
  "business_id"    INTEGER,                      -- null si el negocio fue eliminado
  "nombre_negocio" TEXT NOT NULL,                -- snapshot del nombre al momento del cierre
  "total_kilos"    DOUBLE PRECISION NOT NULL,
  "total_ventas"   DOUBLE PRECISION NOT NULL,
  "total_pedidos"  INTEGER NOT NULL,

  CONSTRAINT "CierreMesDetalle_cierre_id_fkey" FOREIGN KEY ("cierre_id")
    REFERENCES "CierreMes"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

-- Vincular órdenes al cierre (null = período actual abierto)
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "cierre_id" INTEGER;

ALTER TABLE "Order" ADD CONSTRAINT "Order_cierre_id_fkey"
  FOREIGN KEY ("cierre_id") REFERENCES "CierreMes"("id")
  ON UPDATE CASCADE ON DELETE SET NULL;

-- Índices para performance
CREATE INDEX "CierreMes_fecha_cierre_idx" ON "CierreMes"("fecha_cierre" DESC);
CREATE INDEX "CierreMesDetalle_cierre_id_idx" ON "CierreMesDetalle"("cierre_id");
CREATE INDEX "Order_cierre_id_idx" ON "Order"("cierre_id");
