ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "content_cluster" text;
ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "target_page" text;
ALTER TABLE "news" ADD COLUMN IF NOT EXISTS "search_metrics" jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS "news_cluster_idx" ON "news" ("content_cluster");
