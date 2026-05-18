-- ═══════════════════════════════════════════════════════════════
-- Argaman Clinic — Enhancements: Audit Trail + Login History
-- הרץ פעם אחת ב-Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ───── 1. Login History ─────
CREATE TABLE IF NOT EXISTS argaman_login_history (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email       TEXT,
  event       TEXT NOT NULL CHECK (event IN ('login_success','login_failed','logout','password_reset_requested','password_changed','2fa_enrolled','2fa_failed')),
  user_agent  TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON argaman_login_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_event ON argaman_login_history(event, created_at DESC);

-- ───── 2. Action Log (audit of all CRUD) ─────
CREATE TABLE IF NOT EXISTS argaman_action_log (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    TEXT,
  user_role     TEXT,
  action        TEXT NOT NULL,         -- 'create','update','delete','view','export','login','logout'
  entity_type   TEXT NOT NULL,         -- 'client','lead','session','article','faq','user','setting',...
  entity_id     TEXT,
  entity_label  TEXT,                  -- human-readable: "ליד יוסי כהן"
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_action_log_user   ON argaman_action_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_log_entity ON argaman_action_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_action_log_time   ON argaman_action_log(created_at DESC);

-- ───── 3. RLS ─────
ALTER TABLE argaman_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE argaman_action_log    ENABLE ROW LEVEL SECURITY;

-- Login history policies
DROP POLICY IF EXISTS "owner_read_all_login" ON argaman_login_history;
CREATE POLICY "owner_read_all_login" ON argaman_login_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM argaman_users WHERE user_id = auth.uid() AND role = 'owner'));

DROP POLICY IF EXISTS "self_read_login" ON argaman_login_history;
CREATE POLICY "self_read_login" ON argaman_login_history FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_login_event" ON argaman_login_history;
CREATE POLICY "insert_login_event" ON argaman_login_history FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Also allow anonymous failed login attempts to be logged
DROP POLICY IF EXISTS "anon_insert_failed_login" ON argaman_login_history;
CREATE POLICY "anon_insert_failed_login" ON argaman_login_history FOR INSERT TO anon
  WITH CHECK (event = 'login_failed');

-- Action log policies
DROP POLICY IF EXISTS "owner_read_all_actions" ON argaman_action_log;
CREATE POLICY "owner_read_all_actions" ON argaman_action_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM argaman_users WHERE user_id = auth.uid() AND role = 'owner'));

DROP POLICY IF EXISTS "self_read_actions" ON argaman_action_log;
CREATE POLICY "self_read_actions" ON argaman_action_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_actions" ON argaman_action_log;
CREATE POLICY "insert_own_actions" ON argaman_action_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ───── 4. Auto-cleanup (keep 12 months) ─────
-- Optional: run periodically. For now, indexes will keep things fast.

-- ✓ Done!
SELECT 'argaman_login_history' AS table_name, COUNT(*) AS rows FROM argaman_login_history
UNION ALL
SELECT 'argaman_action_log', COUNT(*) FROM argaman_action_log;
