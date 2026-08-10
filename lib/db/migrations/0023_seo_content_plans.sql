CREATE TABLE IF NOT EXISTS seo_content_plans (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seo_content_plans_updated_idx
  ON seo_content_plans (updated_at DESC);
