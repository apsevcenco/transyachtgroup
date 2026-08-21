CREATE TABLE IF NOT EXISTS customer_reviews (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  vehicle_name TEXT,
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  request_message TEXT,
  review_url TEXT,
  rating INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  review_text TEXT,
  google_review_url TEXT,
  reply_draft TEXT,
  reply_published_at TIMESTAMP,
  show_on_site BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at TIMESTAMP,
  received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customer_reviews_status_idx ON customer_reviews(status, created_at);
