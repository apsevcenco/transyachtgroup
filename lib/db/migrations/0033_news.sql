CREATE TABLE IF NOT EXISTS news (
  id serial PRIMARY KEY,
  slug varchar(160) NOT NULL UNIQUE,
  title text NOT NULL,
  excerpt text NOT NULL,
  content text NOT NULL,
  cover_image text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta_title text,
  meta_description text,
  translations jsonb DEFAULT '{}'::jsonb,
  primary_keyword text,
  brief text,
  scheduled_at timestamp,
  published boolean NOT NULL DEFAULT false,
  published_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS news_published_at_idx ON news (published, published_at);
CREATE INDEX IF NOT EXISTS news_schedule_idx ON news (scheduled_at);
