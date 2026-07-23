-- Adds the rental_history table (completed-rental CRM snapshots) and
-- documents the "completed" booking status, which needs no DDL of its own.
--
-- "completed" status: bookings.status is a plain varchar(20), not a
-- Postgres enum type, so widening the allowed values (confirmed, tentative,
-- blocked, maintenance, completed) is enforced only in application/Zod
-- validation (lib/db/src/schema/index.ts, insertBookingSchema) — no ALTER
-- TABLE is needed here.

CREATE TABLE IF NOT EXISTS "rental_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer,
	"completed_at" timestamp DEFAULT now(),
	"client_name" text,
	"client_phone" text,
	"client_notes" text,
	"vehicle_id" integer,
	"vehicle_name" text NOT NULL,
	"vehicle_category" varchar(10) NOT NULL,
	"vehicle_image" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_days" integer NOT NULL,
	"total_amount" integer,
	"deposit_amount" integer,
	"vat_percent" integer,
	"agent_commission_percent" integer,
	"charter_rate" integer,
	"charter_rate_period" varchar(10),
	"apa_amount" integer,
	"km_included" integer,
	"price_per_extra_km" integer,
	"departure_port" text,
	"return_port" text,
	"source" varchar(10),
	"ical_url" text,
	"contract_status" varchar(20)
);
--> statement-breakpoint
ALTER TABLE "rental_history"
	ADD CONSTRAINT "rental_history_booking_id_bookings_id_fk"
	FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id")
	ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "rental_history"
	ADD CONSTRAINT "rental_history_vehicle_id_vehicles_id_fk"
	FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id")
	ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rental_history_vehicle_idx" ON "rental_history" ("vehicle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rental_history_dates_idx" ON "rental_history" ("start_date","end_date");
