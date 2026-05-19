-- ═══════════════════════════════════════════════════════════════
-- argaman_error_log — Runtime error capture from CRM client
-- Keeps last 1000 entries; older entries auto-deleted via trigger
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS argaman_error_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT,
  message       TEXT NOT NULL,
  stack         TEXT,
  url           TEXT,
  user_agent    TEXT,
  source        TEXT,                    -- 'error' | 'unhandledrejection' | 'manual'
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_error_log_user ON argaman_error_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_time ON argaman_error_log(created_at DESC);

ALTER TABLE argaman_error_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_errors" ON argaman_error_log;
CREATE POLICY "owner_read_errors" ON argaman_error_log
  FOR SELECT TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "self_read_errors" ON argaman_error_log;
CREATE POLICY "self_read_errors" ON argaman_error_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_errors" ON argaman_error_log;
CREATE POLICY "insert_own_errors" ON argaman_error_log
  FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Allow anonymous error reporting (for pre-login errors)
DROP POLICY IF EXISTS "anon_insert_errors" ON argaman_error_log;
CREATE POLICY "anon_insert_errors" ON argaman_error_log
  FOR INSERT TO anon WITH CHECK (user_id IS NULL);

-- Auto-trim: keep only most recent 1000 entries
CREATE OR REPLACE FUNCTION trim_error_log()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM argaman_error_log) > 1000 THEN
    DELETE FROM argaman_error_log
    WHERE id IN (
      SELECT id FROM argaman_error_log
      ORDER BY created_at ASC
      LIMIT (SELECT GREATEST(COUNT(*) - 1000, 0) FROM argaman_error_log)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trim_error_log ON argaman_error_log;
CREATE TRIGGER trg_trim_error_log
  AFTER INSERT ON argaman_error_log
  FOR EACH STATEMENT EXECUTE FUNCTION trim_error_log();

SELECT 'argaman_error_log' AS table_name, COUNT(*) AS rows FROM argaman_error_log;
