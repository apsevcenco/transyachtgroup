CREATE TABLE IF NOT EXISTS seo_competitors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT UNIQUE NOT NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_scanned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seo_competitor_snapshots (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL,
  page_url TEXT NOT NULL,
  title TEXT,
  meta_description TEXT,
  h1 TEXT,
  content_hash VARCHAR(64) NOT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  changed BOOLEAN NOT NULL DEFAULT FALSE,
  scanned_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seo_competitor_snapshots_lookup_idx
  ON seo_competitor_snapshots (competitor_id, scanned_at DESC);

CREATE TABLE IF NOT EXISTS seo_opportunities (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  keyword TEXT,
  target_page TEXT,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS seo_opportunities_status_idx
  ON seo_opportunities (status, created_at DESC);
