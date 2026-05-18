-- ═══════════════════════════════════════════════════════════════
-- Argaman Clinic — Row Level Security (RLS) Policies
-- ───────────────────────────────────────────────────────────────
-- Run this AFTER auth-migration.sql, AFTER users are created.
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- Enable RLS on argaman_data (already enabled? force re-enable safely)
-- ───────────────────────────────────────────────────────────────
ALTER TABLE argaman_data ENABLE ROW LEVEL SECURITY;

-- Drop any old generic policies (cleanup)
DROP POLICY IF EXISTS "anon_read_public_only" ON argaman_data;
DROP POLICY IF EXISTS "auth_full_access" ON argaman_data;
DROP POLICY IF EXISTS "Deny all anon access" ON argaman_data;
DROP POLICY IF EXISTS "Allow read for authenticated" ON argaman_data;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON argaman_data;
DROP POLICY IF EXISTS "Allow update for authenticated" ON argaman_data;

-- ───────────────────────────────────────────────────────────────
-- DEFINITION: PHI keys (Protected Health Information) — owner only
-- vs PUBLIC keys (system config, content) — all authenticated users
-- ───────────────────────────────────────────────────────────────
-- PHI (Owner only):     clients, leads, sessions, outcomes,
--                       risk_assessments, audit_log, dek_owner,
--                       voice_recordings, genograms, time_logs
-- Public (auth users):  articles, article_overrides, testimonials,
--                       workshops, prices, videos, faqs,
--                       faq_overrides, settings, templates,
--                       marketing, resources, sticky_notes,
--                       working_hours, notifications
-- ───────────────────────────────────────────────────────────────

-- ───────────────────────────────────────────────────────────────
-- POLICY 1: All authenticated users can READ public/non-PHI keys
-- ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "all_users_read_public" ON argaman_data;
CREATE POLICY "all_users_read_public"
  ON argaman_data FOR SELECT
  TO authenticated
  USING (
    key NOT IN (
      'clients','leads','sessions','outcomes','risk_assessments',
      'audit_log','dek_owner','voice_recordings','genograms',
      'time_logs','treatment_plans'
    )
  );

-- ───────────────────────────────────────────────────────────────
-- POLICY 2: Owner role can READ everything (including PHI)
-- ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_read_all" ON argaman_data;
CREATE POLICY "owner_read_all"
  ON argaman_data FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM argaman_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ───────────────────────────────────────────────────────────────
-- POLICY 3: Owner can WRITE everything
-- ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "owner_write_all" ON argaman_data;
CREATE POLICY "owner_write_all"
  ON argaman_data FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM argaman_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM argaman_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ───────────────────────────────────────────────────────────────
-- POLICY 4: Developer can WRITE only public (non-PHI) keys
-- ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "developer_write_public" ON argaman_data;
CREATE POLICY "developer_write_public"
  ON argaman_data FOR INSERT
  TO authenticated
  WITH CHECK (
    key NOT IN (
      'clients','leads','sessions','outcomes','risk_assessments',
      'audit_log','dek_owner','voice_recordings','genograms',
      'time_logs','treatment_plans'
    ) AND
    EXISTS (
      SELECT 1 FROM argaman_users
      WHERE user_id = auth.uid() AND role IN ('developer','owner')
    )
  );

DROP POLICY IF EXISTS "developer_update_public" ON argaman_data;
CREATE POLICY "developer_update_public"
  ON argaman_data FOR UPDATE
  TO authenticated
  USING (
    key NOT IN (
      'clients','leads','sessions','outcomes','risk_assessments',
      'audit_log','dek_owner','voice_recordings','genograms',
      'time_logs','treatment_plans'
    ) AND
    EXISTS (
      SELECT 1 FROM argaman_users
      WHERE user_id = auth.uid() AND role IN ('developer','owner')
    )
  );

-- ───────────────────────────────────────────────────────────────
-- POLICY 5: Block all anonymous access (no anon-key reads)
-- ───────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "block_anon_all" ON argaman_data;
-- We don't create an explicit block policy — RLS denies by default.
-- If no policy matches a role, access is denied.
-- The article-overrides.js script on public site uses public REST GET on specific
-- whitelisted keys (article_overrides, faq_overrides). Add specific exception:

DROP POLICY IF EXISTS "anon_read_specific_public_keys" ON argaman_data;
CREATE POLICY "anon_read_specific_public_keys"
  ON argaman_data FOR SELECT
  TO anon
  USING (
    key IN ('article_overrides','faq_overrides')
  );

-- ───────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (run manually to test)
-- ───────────────────────────────────────────────────────────────
-- Test as owner (replace UID):
--   SET request.jwt.claims = '{"sub":"<owner-uid>","role":"authenticated"}';
--   SELECT key FROM argaman_data;  -- should return all keys
--
-- Test as developer:
--   SET request.jwt.claims = '{"sub":"<dev-uid>","role":"authenticated"}';
--   SELECT key FROM argaman_data;  -- should NOT return clients/leads/sessions
--
-- Test as anon (no JWT):
--   SET request.jwt.claims = NULL;
--   SELECT key FROM argaman_data;  -- only article_overrides + faq_overrides
-- ───────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════
-- POLICIES INSTALLED.
-- Next: Login from CRM with each user — verify what they see.
-- ═══════════════════════════════════════════════════════════════
