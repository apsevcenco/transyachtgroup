ALTER TABLE news
  ADD COLUMN IF NOT EXISTS seo_score integer,
  ADD COLUMN IF NOT EXISTS seo_audit jsonb DEFAULT '{}'::jsonb;
