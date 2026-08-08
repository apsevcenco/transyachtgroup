CREATE TABLE IF NOT EXISTS guides (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(160) NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT,
  meta_title TEXT,
  meta_description TEXT,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guides_published_at_idx
  ON guides (published, published_at DESC);
