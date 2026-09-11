CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  place_of_birth TEXT,
  nationality TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  driver_license_number TEXT,
  driver_license_expiry DATE,
  driver_license_issued_by TEXT,
  legal_entity TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customers_full_name_idx ON customers(full_name);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);
CREATE INDEX IF NOT EXISTS customers_email_idx ON customers(email);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE rental_history ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL;

WITH contract_customers AS (
  INSERT INTO customers (
    full_name,
    phone,
    email,
    date_of_birth,
    place_of_birth,
    nationality,
    passport_number,
    passport_expiry,
    driver_license_number,
    driver_license_expiry,
    driver_license_issued_by,
    legal_entity,
    created_at,
    updated_at
  )
  SELECT DISTINCT ON (
    lower(trim(coalesce(renter_email, ''))),
    regexp_replace(coalesce(renter_phone, ''), '\D', '', 'g'),
    lower(trim(renter_name))
  )
    trim(renter_name),
    nullif(trim(renter_phone), ''),
    nullif(trim(renter_email), ''),
    CASE WHEN renter_dob ~ '^\d{4}-\d{2}-\d{2}$' THEN renter_dob::date ELSE NULL END,
    nullif(trim(renter_pob), ''),
    nullif(trim(renter_nationality), ''),
    nullif(trim(renter_passport), ''),
    CASE WHEN renter_passport_expiry ~ '^\d{4}-\d{2}-\d{2}$' THEN renter_passport_expiry::date ELSE NULL END,
    nullif(trim(renter_licence), ''),
    CASE WHEN renter_licence_expiry ~ '^\d{4}-\d{2}-\d{2}$' THEN renter_licence_expiry::date ELSE NULL END,
    nullif(trim(renter_licence_issued_by), ''),
    nullif(trim(renter_legal_entity), ''),
    min(created_at),
    NOW()
  FROM contracts
  WHERE nullif(trim(renter_name), '') IS NOT NULL
  GROUP BY
    renter_name,
    renter_phone,
    renter_email,
    renter_dob,
    renter_pob,
    renter_nationality,
    renter_passport,
    renter_passport_expiry,
    renter_licence,
    renter_licence_expiry,
    renter_licence_issued_by,
    renter_legal_entity
  RETURNING id, full_name, phone, email
),
booking_customers AS (
  INSERT INTO customers (full_name, phone, email, notes, created_at, updated_at)
  SELECT DISTINCT ON (
    lower(trim(coalesce(client_email, ''))),
    regexp_replace(coalesce(client_phone, ''), '\D', '', 'g'),
    lower(trim(client_name))
  )
    trim(client_name),
    nullif(trim(client_phone), ''),
    nullif(trim(client_email), ''),
    'Imported from bookings',
    min(created_at),
    NOW()
  FROM bookings b
  WHERE nullif(trim(client_name), '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM customers c
      WHERE
        (b.client_email IS NOT NULL AND c.email IS NOT NULL AND lower(trim(c.email)) = lower(trim(b.client_email)))
        OR (b.client_phone IS NOT NULL AND c.phone IS NOT NULL AND regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(b.client_phone, '\D', '', 'g'))
    )
  GROUP BY client_name, client_phone, client_email
  RETURNING id, full_name, phone, email
),
history_customers AS (
  INSERT INTO customers (full_name, phone, notes, created_at, updated_at)
  SELECT DISTINCT ON (
    regexp_replace(coalesce(client_phone, ''), '\D', '', 'g'),
    lower(trim(client_name))
  )
    trim(client_name),
    nullif(trim(client_phone), ''),
    'Imported from rental history',
    min(completed_at),
    NOW()
  FROM rental_history rh
  WHERE nullif(trim(client_name), '') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM customers c
      WHERE
        (rh.client_phone IS NOT NULL AND c.phone IS NOT NULL AND regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(rh.client_phone, '\D', '', 'g'))
        OR lower(trim(c.full_name)) = lower(trim(rh.client_name))
    )
  GROUP BY client_name, client_phone
  RETURNING id, full_name, phone, email
),
all_customers AS (
  SELECT id, full_name, phone, email FROM customers
)
UPDATE contracts ct
SET customer_id = c.id
FROM all_customers c
WHERE ct.customer_id IS NULL
  AND nullif(trim(ct.renter_name), '') IS NOT NULL
  AND (
    (ct.renter_email IS NOT NULL AND c.email IS NOT NULL AND lower(trim(c.email)) = lower(trim(ct.renter_email)))
    OR (ct.renter_phone IS NOT NULL AND c.phone IS NOT NULL AND regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(ct.renter_phone, '\D', '', 'g'))
    OR lower(trim(c.full_name)) = lower(trim(ct.renter_name))
  );

UPDATE bookings b
SET customer_id = c.id
FROM customers c
WHERE b.customer_id IS NULL
  AND nullif(trim(b.client_name), '') IS NOT NULL
  AND (
    (b.client_email IS NOT NULL AND c.email IS NOT NULL AND lower(trim(c.email)) = lower(trim(b.client_email)))
    OR (b.client_phone IS NOT NULL AND c.phone IS NOT NULL AND regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(b.client_phone, '\D', '', 'g'))
    OR lower(trim(c.full_name)) = lower(trim(b.client_name))
  );

UPDATE rental_history rh
SET customer_id = c.id
FROM customers c
WHERE rh.customer_id IS NULL
  AND nullif(trim(rh.client_name), '') IS NOT NULL
  AND (
    (rh.client_phone IS NOT NULL AND c.phone IS NOT NULL AND regexp_replace(c.phone, '\D', '', 'g') = regexp_replace(rh.client_phone, '\D', '', 'g'))
    OR lower(trim(c.full_name)) = lower(trim(rh.client_name))
  );
