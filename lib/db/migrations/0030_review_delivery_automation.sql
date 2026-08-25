ALTER TABLE customer_reviews
  ADD COLUMN IF NOT EXISTS automatic BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_status VARCHAR(20) NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS email_status VARCHAR(20) NOT NULL DEFAULT 'not_requested',
  ADD COLUMN IF NOT EXISTS delivery_error TEXT,
  ADD COLUMN IF NOT EXISTS send_attempts INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS customer_reviews_automatic_booking_unique_idx
  ON customer_reviews (booking_id)
  WHERE booking_id IS NOT NULL AND automatic = TRUE;

CREATE TABLE IF NOT EXISTS review_delivery_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  google_review_url TEXT,
  default_language VARCHAR(10) NOT NULL DEFAULT 'en',
  send_whatsapp BOOLEAN NOT NULL DEFAULT TRUE,
  send_email BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO review_delivery_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
