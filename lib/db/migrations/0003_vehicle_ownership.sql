-- Adds vehicles.ownership ("own" | "agent"), used to distinguish our own
-- fleet from agent-sourced vehicles. Cars only in the UI, but the column
-- applies to all vehicles (yachts just default to "own" and are never
-- shown/edited via this field).

ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "ownership" varchar(10) NOT NULL DEFAULT 'own';
