-- ═══════════════════════════════════════════════════════════════
-- argaman_honeypots — Canary records for insider snooping detection
-- Any SELECT on these triggers an alert
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS argaman_honeypot_access (
  id              BIGSERIAL PRIMARY KEY,
  honeypot_id     TEXT NOT NULL,           -- e.g. 'canary-001'
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email      TEXT,
  action          TEXT,                    -- 'read','update','delete','search'
  ip_address      TEXT,
  user_agent      TEXT,
  accessed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_honeypot_user ON argaman_honeypot_access(user_id, accessed_at DESC);

ALTER TABLE argaman_honeypot_access ENABLE ROW LEVEL SECURITY;

-- Only owner can read honeypot access logs
DROP POLICY IF EXISTS "owner_read_honeypot" ON argaman_honeypot_access;
CREATE POLICY "owner_read_honeypot" ON argaman_honeypot_access
  FOR SELECT TO authenticated USING (public.is_owner());

-- Anyone authenticated can INSERT (for tracking their own potential snooping)
DROP POLICY IF EXISTS "any_insert_honeypot" ON argaman_honeypot_access;
CREATE POLICY "any_insert_honeypot" ON argaman_honeypot_access
  FOR INSERT TO authenticated WITH CHECK (true);

SELECT 'argaman_honeypot_access' AS table_name, COUNT(*) AS rows FROM argaman_honeypot_access;
