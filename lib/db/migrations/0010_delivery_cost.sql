-- Adds delivery_cost (nullable integer) to bookings and rental_history,
-- alongside driver_cost/fuel_cost/toll_cost from 0009 — "own" vehicle
-- bookings only, factored into net profit as an additional expense.

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "delivery_cost" integer;
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "delivery_cost" integer;
