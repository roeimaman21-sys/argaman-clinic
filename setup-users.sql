-- ═══════════════════════════════════════════════════════════════
-- Argaman Clinic — Setup ALL-IN-ONE
-- ───────────────────────────────────────────────────────────────
-- ⚠️ לפני הרצה — מלא את 2 ה-UID-ים למטה:
--   UID_GAL  = ה-UID של argamanclinic@gmail.com
--   UID_DEV  = ה-UID של המשתמש החדש שיצרת
-- ═══════════════════════════════════════════════════════════════

-- ───── 1. טבלת משתמשים + תפקידים ─────
CREATE TABLE IF NOT EXISTS argaman_users (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL UNIQUE,
  role         TEXT NOT NULL CHECK (role IN ('owner','developer','staff')),
  display_name TEXT,
  can_see_phi  BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_argaman_users_role  ON argaman_users(role);
CREATE INDEX IF NOT EXISTS idx_argaman_users_email ON argaman_users(email);

-- RLS על argaman_users עצמה
ALTER TABLE argaman_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_own" ON argaman_users;
CREATE POLICY "users_read_own" ON argaman_users
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "owners_full_users" ON argaman_users;
CREATE POLICY "owners_full_users" ON argaman_users FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM argaman_users WHERE user_id = auth.uid() AND role = 'owner'));

-- ───── 2. הוספת timestamps + Realtime על argaman_data ─────
ALTER TABLE argaman_data
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

CREATE OR REPLACE FUNCTION update_argaman_data_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); NEW.updated_by = auth.uid(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_argaman_data_updated_at ON argaman_data;
CREATE TRIGGER trg_argaman_data_updated_at
  BEFORE INSERT OR UPDATE ON argaman_data
  FOR EACH ROW EXECUTE FUNCTION update_argaman_data_timestamp();

-- הפעלת Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE argaman_data;

-- ───── 3. הכנסת 2 המשתמשים ─────
-- ⚠️ החלף את ה-UID-ים:
INSERT INTO argaman_users (user_id, email, role, display_name, can_see_phi)
VALUES
  ('PASTE-UID-GAL-HERE',  'argamanclinic@gmail.com', 'owner',     'גל ממן',     TRUE),
  ('PASTE-UID-DEV-HERE',  'PASTE-DEV-EMAIL-HERE',    'developer', 'מפתח',       FALSE)
ON CONFLICT (user_id) DO UPDATE
SET email = EXCLUDED.email,
    role = EXCLUDED.role,
    display_name = EXCLUDED.display_name,
    can_see_phi = EXCLUDED.can_see_phi,
    updated_at = NOW();

-- ───── 4. RLS Policies על argaman_data ─────
ALTER TABLE argaman_data ENABLE ROW LEVEL SECURITY;

-- ניקוי policies ישנים
DROP POLICY IF EXISTS "anon_read_public_only" ON argaman_data;
DROP POLICY IF EXISTS "auth_full_access" ON argaman_data;
DROP POLICY IF EXISTS "Deny all anon access" ON argaman_data;
DROP POLICY IF EXISTS "all_users_read_public" ON argaman_data;
DROP POLICY IF EXISTS "owner_read_all" ON argaman_data;
DROP POLICY IF EXISTS "owner_write_all" ON argaman_data;
DROP POLICY IF EXISTS "developer_write_public" ON argaman_data;
DROP POLICY IF EXISTS "developer_update_public" ON argaman_data;
DROP POLICY IF EXISTS "anon_read_specific_public_keys" ON argaman_data;

-- POLICY 1: כל משתמש מאומת יכול לקרוא נתונים פומביים (לא PHI)
CREATE POLICY "all_users_read_public" ON argaman_data FOR SELECT TO authenticated
  USING (
    key NOT IN (
      'argaman_clients','argaman_leads','argaman_sessions','argaman_outcomes',
      'argaman_risk_assessments','argaman_audit_log','argaman_voice_recordings',
      'argaman_genograms','argaman_time_logs','argaman_treatment_plans',
      'argaman_notifications','argaman_sticky_notes'
    )
  );

-- POLICY 2: owner קורא הכל (כולל PHI)
CREATE POLICY "owner_read_all" ON argaman_data FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM argaman_users WHERE user_id = auth.uid() AND role = 'owner'));

-- POLICY 3: owner כותב/מוחק הכל
CREATE POLICY "owner_write_all" ON argaman_data FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM argaman_users WHERE user_id = auth.uid() AND role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM argaman_users WHERE user_id = auth.uid() AND role = 'owner'));

-- POLICY 4: developer כותב רק נתונים פומביים (לא PHI)
CREATE POLICY "developer_write_public" ON argaman_data FOR INSERT TO authenticated
  WITH CHECK (
    key NOT IN (
      'argaman_clients','argaman_leads','argaman_sessions','argaman_outcomes',
      'argaman_risk_assessments','argaman_audit_log','argaman_voice_recordings',
      'argaman_genograms','argaman_time_logs','argaman_treatment_plans',
      'argaman_notifications','argaman_sticky_notes'
    )
    AND EXISTS (SELECT 1 FROM argaman_users WHERE user_id = auth.uid() AND role IN ('developer','owner'))
  );

CREATE POLICY "developer_update_public" ON argaman_data FOR UPDATE TO authenticated
  USING (
    key NOT IN (
      'argaman_clients','argaman_leads','argaman_sessions','argaman_outcomes',
      'argaman_risk_assessments','argaman_audit_log','argaman_voice_recordings',
      'argaman_genograms','argaman_time_logs','argaman_treatment_plans',
      'argaman_notifications','argaman_sticky_notes'
    )
    AND EXISTS (SELECT 1 FROM argaman_users WHERE user_id = auth.uid() AND role IN ('developer','owner'))
  );

-- POLICY 5: anon (האתר הציבורי) — רק article_overrides + faq_overrides
CREATE POLICY "anon_read_specific" ON argaman_data FOR SELECT TO anon
  USING (key IN ('argaman_article_overrides','argaman_faq_overrides'));

-- ═══════════════════════════════════════════════════════════════
-- ✅ סיום! בדוק שהכל תקין:
SELECT user_id, email, role, can_see_phi FROM argaman_users;
-- ═══════════════════════════════════════════════════════════════
