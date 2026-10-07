CREATE TABLE IF NOT EXISTS partner_contacts (
  id serial PRIMARY KEY,
  city text NOT NULL,
  category varchar(40) NOT NULL,
  organization text NOT NULL,
  email text NOT NULL,
  phone text,
  contact_person text,
  notes text,
  source_status text,
  source_checked_at date,
  source_url text,
  status varchar(30) NOT NULL DEFAULT 'new',
  last_contacted_at timestamp,
  next_follow_up_at timestamp,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_contacts_city_idx ON partner_contacts(city);
CREATE INDEX IF NOT EXISTS partner_contacts_category_idx ON partner_contacts(category);
CREATE INDEX IF NOT EXISTS partner_contacts_email_idx ON partner_contacts(email);
CREATE INDEX IF NOT EXISTS partner_contacts_status_idx ON partner_contacts(status, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS partner_contacts_unique_contact_idx
  ON partner_contacts (lower(email), lower(organization), lower(city), category);
