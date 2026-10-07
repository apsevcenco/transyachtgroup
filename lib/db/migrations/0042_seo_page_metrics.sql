CREATE TABLE IF NOT EXISTS seo_page_metrics (
  id serial PRIMARY KEY,
  url text NOT NULL,
  path text NOT NULL UNIQUE,
  page_type varchar(40) NOT NULL DEFAULT 'other',
  title text,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr double precision NOT NULL DEFAULT 0,
  position double precision NOT NULL DEFAULT 0,
  source varchar(40) NOT NULL DEFAULT 'search-console',
  imported_at timestamp DEFAULT now(),
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_page_metrics_path_idx ON seo_page_metrics (path);
CREATE INDEX IF NOT EXISTS seo_page_metrics_page_type_idx ON seo_page_metrics (page_type);
CREATE INDEX IF NOT EXISTS seo_page_metrics_imported_at_idx ON seo_page_metrics (imported_at);
