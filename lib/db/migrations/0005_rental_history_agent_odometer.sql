-- Mirrors migration 0004 onto rental_history, so the completed-rental
-- snapshot carries agent contact info and odometer/deposit-status data
-- from the source booking at the time it was marked completed.

ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "agent_name" text;
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "agent_phone" text;
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "agent_email" text;
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "odometer_out" integer;
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "odometer_in" integer;
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "deposit_status" varchar(20);
