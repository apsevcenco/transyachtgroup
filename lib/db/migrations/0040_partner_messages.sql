-- Partner CRM email history: every outbound letter and every inbound reply
-- (received through the Resend webhook), linked to a partner contact when the
-- address matches. Safe to apply before deploying the code that uses it.

ALTER TABLE partner_contacts
  ADD COLUMN IF NOT EXISTS last_reply_at timestamp;

CREATE TABLE IF NOT EXISTS partner_messages (
  id serial PRIMARY KEY,
  partner_contact_id integer REFERENCES partner_contacts(id) ON DELETE SET NULL,
  business_letter_id integer REFERENCES business_letters(id) ON DELETE SET NULL,
  direction varchar(10) NOT NULL,
  email text NOT NULL,
  subject text,
  body_text text,
  provider_message_id text,
  status varchar(20) NOT NULL DEFAULT 'sent',
  error text,
  has_attachment boolean NOT NULL DEFAULT false,
  read_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

-- Webhooks are retried; this makes processing the same event twice a no-op.
CREATE UNIQUE INDEX IF NOT EXISTS partner_messages_provider_idx
  ON partner_messages (direction, provider_message_id)
  WHERE provider_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS partner_messages_contact_idx
  ON partner_messages (partner_contact_id, created_at);

CREATE INDEX IF NOT EXISTS partner_messages_unread_idx
  ON partner_messages (partner_contact_id)
  WHERE direction = 'inbound' AND read_at IS NULL;

CREATE INDEX IF NOT EXISTS partner_messages_email_idx
  ON partner_messages (lower(email));

CREATE INDEX IF NOT EXISTS partner_contacts_follow_up_idx
  ON partner_contacts (next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;
