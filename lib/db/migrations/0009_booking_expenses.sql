-- Adds optional expense fields (driver_cost, fuel_cost, toll_cost) to
-- bookings and rental_history — "own" vehicle bookings only, factored
-- into net profit alongside the existing commission/extra-km terms.

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "driver_cost" integer;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "fuel_cost" integer;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "toll_cost" integer;
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "driver_cost" integer;
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "fuel_cost" integer;
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "toll_cost" integer;
