-- Origen del pedido: permite distinguir ventas presenciales vs acordadas por WhatsApp
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "origen" TEXT NOT NULL DEFAULT 'presencial';

-- Índice para filtrar por origen en reportes
CREATE INDEX IF NOT EXISTS "Order_origen_idx" ON "Order"("origen");
