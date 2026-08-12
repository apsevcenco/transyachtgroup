ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "deleted_by" TEXT;

CREATE INDEX IF NOT EXISTS "vehicles_deleted_at_idx"
  ON "vehicles" ("deleted_at");

CREATE TABLE IF NOT EXISTS "vehicle_deletion_log" (
  "id" SERIAL PRIMARY KEY,
  "vehicle_id" INTEGER,
  "vehicle_name" TEXT NOT NULL,
  "vehicle_category" VARCHAR(10) NOT NULL,
  "action" VARCHAR(20) NOT NULL,
  "actor" TEXT NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "vehicle_deletion_log_vehicle_idx"
  ON "vehicle_deletion_log" ("vehicle_id");
CREATE INDEX IF NOT EXISTS "vehicle_deletion_log_created_idx"
  ON "vehicle_deletion_log" ("created_at" DESC);
