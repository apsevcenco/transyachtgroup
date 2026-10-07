CREATE TABLE IF NOT EXISTS "answers" (
  "id" serial PRIMARY KEY,
  "slug" varchar(160) NOT NULL UNIQUE,
  "question" text NOT NULL,
  "direct_answer" text NOT NULL,
  "explanation" text NOT NULL,
  "faq" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "meta_title" text,
  "meta_description" text,
  "primary_keyword" text,
  "audience" text,
  "related_service_path" text,
  "language" varchar(10) NOT NULL DEFAULT 'en',
  "published" boolean NOT NULL DEFAULT false,
  "published_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "answers_published_at_idx" ON "answers" ("published", "published_at");
CREATE INDEX IF NOT EXISTS "answers_keyword_idx" ON "answers" ("primary_keyword");
