CREATE TABLE IF NOT EXISTS seo_content_plans (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE seo_content_plans
  ADD COLUMN IF NOT EXISTS strategy JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS seo_content_plans_updated_idx
  ON seo_content_plans (updated_at DESC);
