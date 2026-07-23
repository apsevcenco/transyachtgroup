-- Adds agent contact fields and car handover/return tracking to bookings.
-- agent_name/phone/email: contact for a broker/agent who arranged the
-- rental (independent of vehicles.ownership). odometer_out/in and
-- deposit_status: "own" vehicle car bookings only, used to compute
-- actual/extra km and the deposit-to-return amount on the frontend.

ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "agent_name" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "agent_phone" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "agent_email" text;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "odometer_out" integer;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "odometer_in" integer;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "deposit_status" varchar(20);
