-- ═══════════════════════════════════════════════════════════════
-- argaman_dsar_requests — DSAR Deadline Tracker (תיקון 13)
-- 30-day mandatory response time
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS argaman_dsar_requests (
  id              BIGSERIAL PRIMARY KEY,
  client_id       TEXT NOT NULL,
  client_name     TEXT,
  request_type    TEXT NOT NULL DEFAULT 'access' CHECK (request_type IN ('access','rectification','erasure','portability','revoke_consent')),
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  due_at          TIMESTAMPTZ GENERATED ALWAYS AS (requested_at + INTERVAL '30 days') STORED,
  completed_at    TIMESTAMPTZ,
  exported_file_url TEXT,
  notes           TEXT,
  requested_by_user UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_dsar_due ON argaman_dsar_requests(due_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsar_client ON argaman_dsar_requests(client_id);

ALTER TABLE argaman_dsar_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manage_dsar" ON argaman_dsar_requests;
CREATE POLICY "owner_manage_dsar" ON argaman_dsar_requests
  FOR ALL TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

SELECT 'argaman_dsar_requests' AS table_name, COUNT(*) AS rows FROM argaman_dsar_requests;
