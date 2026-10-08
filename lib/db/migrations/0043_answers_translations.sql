-- AI-assisted translations for answers: { "fr": { question, directAnswer, explanation, faq, metaTitle, metaDescription }, ... }
-- English stays in the existing columns. Apply in Supabase (SQL Editor) BEFORE deploying the code that reads this column.
ALTER TABLE answers ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;
