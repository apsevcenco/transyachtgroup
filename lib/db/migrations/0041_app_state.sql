-- Tiny key/value store for server-side bookkeeping that must survive restarts
-- and redeploys (currently: the date the daily Partner CRM digest last went
-- out, so a deploy never sends it twice). Deliberately not site_content, which
-- is served publicly.
CREATE TABLE IF NOT EXISTS app_state (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);
