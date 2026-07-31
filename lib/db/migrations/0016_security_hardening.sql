-- Revoke all legacy sessions: older rows contain raw bearer tokens, while the
-- hardened application stores SHA-256 token digests in the same column.
DELETE FROM admin_sessions;

CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx
  ON admin_sessions (expires_at);
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS contact_requests_created_at_idx
  ON contact_requests (created_at);

-- Apply least privilege after migrations using the actual runtime role name:
-- REVOKE CREATE ON SCHEMA public FROM <runtime_role>;
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM <runtime_role>;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO <runtime_role>;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO <runtime_role>;
