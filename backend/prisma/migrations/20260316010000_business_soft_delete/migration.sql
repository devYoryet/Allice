-- Soft-delete para Business: solo el supermaster puede eliminar negocios
-- Los kilos quedan disponibles para reasignar a otro negocio

ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "deleted_at"        TIMESTAMP(3);
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "deleted_by_email"  TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "kilos_al_eliminar" DOUBLE PRECISION;
