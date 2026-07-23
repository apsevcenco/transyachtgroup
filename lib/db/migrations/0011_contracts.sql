-- Adds the contracts table for the Rental Agreement PDF generator — an
-- audit trail (who rented what, on what terms) and the source of truth for
-- the sequential per-day contract numbering scheme (TYG-DDMMYY-XXX).
--
-- Run manually in Supabase's SQL editor rather than via drizzle-kit, so it
-- stays plain, unquoted, basic PostgreSQL: no FK constraints, no indexes,
-- dates stored as TEXT. Required fields (pickup_date, total_amount,
-- representative_name, etc.) are enforced at the application layer in
-- api-server/src/routes/contracts.ts before insert, not by the DB schema.

CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  contract_number VARCHAR(50) UNIQUE NOT NULL,
  booking_id INTEGER,
  vehicle_id INTEGER,
  renter_name TEXT NOT NULL,
  renter_dob TEXT,
  renter_pob TEXT,
  renter_nationality TEXT,
  renter_passport TEXT,
  renter_passport_expiry TEXT,
  renter_licence TEXT,
  renter_licence_expiry TEXT,
  renter_licence_issued_by TEXT,
  renter_phone TEXT,
  renter_email TEXT,
  pickup_date TEXT,
  return_date TEXT,
  pickup_location TEXT,
  return_location TEXT,
  total_amount INTEGER,
  deposit_amount INTEGER,
  km_per_day INTEGER,
  extra_km_price INTEGER,
  representative_name TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
