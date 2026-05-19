-- ═══════════════════════════════════════════════════════════════
-- argaman_trusted_devices — Silent device recognition
-- Logs first-seen + last-seen fingerprint per user
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS argaman_trusted_devices (
  id              BIGSERIAL PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint     TEXT NOT NULL,
  label           TEXT,                    -- e.g. "Mac Safari · Tel Aviv"
  user_agent      TEXT,
  geo_country     TEXT,                    -- IL, US, etc.
  geo_city        TEXT,
  first_seen      TIMESTAMPTZ DEFAULT NOW(),
  last_seen       TIMESTAMPTZ DEFAULT NOW(),
  is_trusted      BOOLEAN DEFAULT TRUE,
  UNIQUE (user_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON argaman_trusted_devices(user_id, last_seen DESC);

ALTER TABLE argaman_trusted_devices ENABLE ROW LEVEL SECURITY;

-- Each user can see their own devices
DROP POLICY IF EXISTS "self_read_devices" ON argaman_trusted_devices;
CREATE POLICY "self_read_devices" ON argaman_trusted_devices
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Owner can see all devices (for security review)
DROP POLICY IF EXISTS "owner_read_all_devices" ON argaman_trusted_devices;
CREATE POLICY "owner_read_all_devices" ON argaman_trusted_devices
  FOR SELECT TO authenticated USING (public.is_owner());

-- Insert/update own device
DROP POLICY IF EXISTS "self_manage_devices" ON argaman_trusted_devices;
CREATE POLICY "self_manage_devices" ON argaman_trusted_devices
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

SELECT 'argaman_trusted_devices' AS table_name, COUNT(*) AS rows FROM argaman_trusted_devices;
