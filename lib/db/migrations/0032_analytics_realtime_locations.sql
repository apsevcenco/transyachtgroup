ALTER TABLE analytics_events
  ADD COLUMN IF NOT EXISTS region VARCHAR(80),
  ADD COLUMN IF NOT EXISTS city VARCHAR(120),
  ADD COLUMN IF NOT EXISTS ip_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS analytics_events_realtime_idx
  ON analytics_events (created_at, session_id);

CREATE INDEX IF NOT EXISTS analytics_events_location_idx
  ON analytics_events (country, city);
