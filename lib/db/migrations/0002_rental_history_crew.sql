-- Adds yacht crew fields to rental_history, matching bookings' captain/
-- stewardess/deckhand fields, so the CRM detail card can show crew info
-- for completed yacht charters.

ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "captain_name" text;
--> statement-breakpoint
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "captain_day_rate" integer;
--> statement-breakpoint
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "stewardess_count" integer;
--> statement-breakpoint
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "stewardess_day_rate" integer;
--> statement-breakpoint
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "deckhand_count" integer;
--> statement-breakpoint
ALTER TABLE "rental_history" ADD COLUMN IF NOT EXISTS "deckhand_day_rate" integer;
