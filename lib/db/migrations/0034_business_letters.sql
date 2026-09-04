CREATE TABLE IF NOT EXISTS business_letters (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_name TEXT,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  topic TEXT NOT NULL,
  service TEXT NOT NULL,
  notes TEXT,
  image_url TEXT,
  signer_name TEXT,
  signer_role TEXT,
  copy JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sent_to TEXT,
  last_sent_at TIMESTAMP,
  send_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_letters_updated_idx
ON business_letters(updated_at);

CREATE INDEX IF NOT EXISTS business_letters_language_idx
ON business_letters(language);
