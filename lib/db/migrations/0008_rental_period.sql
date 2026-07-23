-- Adds rental_period_type ("daily" | "monthly") to bookings and
-- rental_history, driving how the booking form auto-calculates
-- totalAmount (days x price/day vs months x price/month).

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "rental_period_type" varchar(10) NOT NULL DEFAULT 'daily';
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "rental_period_type" varchar(10) NOT NULL DEFAULT 'daily';
