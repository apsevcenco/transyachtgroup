ALTER TABLE guides
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS content_cluster TEXT,
  ADD COLUMN IF NOT EXISTS target_page TEXT,
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS seo_score INTEGER,
  ADD COLUMN IF NOT EXISTS seo_audit JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS search_metrics JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS guides_schedule_idx ON guides (scheduled_at);
CREATE INDEX IF NOT EXISTS guides_cluster_idx ON guides (content_cluster);
