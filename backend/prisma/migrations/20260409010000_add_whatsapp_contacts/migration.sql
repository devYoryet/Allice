-- Registro de contactos por WhatsApp — historial por negocio
-- Permite saber cuándo se contactó, si generó venta y pendientes de entrega

CREATE TABLE IF NOT EXISTS "WhatsAppContact" (
  "id"           SERIAL PRIMARY KEY,
  "business_id"  INTEGER NOT NULL,
  "user_id"      INTEGER NOT NULL,
  "fecha"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "numero_usado" TEXT,
  "genero_venta" BOOLEAN NOT NULL DEFAULT false,
  "pedido_kilos" DOUBLE PRECISION,
  "precio_kg"    DOUBLE PRECISION,
  "notas"        TEXT,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WhatsAppContact_business_id_fkey" FOREIGN KEY ("business_id")
    REFERENCES "Business"("id") ON UPDATE CASCADE ON DELETE CASCADE,

  CONSTRAINT "WhatsAppContact_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "WhatsAppContact_business_id_idx" ON "WhatsAppContact"("business_id");
CREATE INDEX IF NOT EXISTS "WhatsAppContact_fecha_idx"       ON "WhatsAppContact"("fecha" DESC);
