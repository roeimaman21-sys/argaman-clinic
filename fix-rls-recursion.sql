-- ═══════════════════════════════════════════════════════════════
-- Fix: Infinite recursion in argaman_users RLS policy
-- Cause: policies referenced argaman_users from within argaman_users policies
-- Fix: SECURITY DEFINER function bypasses RLS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM argaman_users WHERE user_id = auth.uid() AND role = 'owner');
$$;

DROP POLICY IF EXISTS "users_read_own"     ON argaman_users;
DROP POLICY IF EXISTS "owners_full_users"  ON argaman_users;

CREATE POLICY "authenticated_read_users" ON argaman_users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "owner_insert_users" ON argaman_users
  FOR INSERT TO authenticated WITH CHECK (public.is_owner() OR user_id = auth.uid());

CREATE POLICY "owner_update_users" ON argaman_users
  FOR UPDATE TO authenticated USING (public.is_owner() OR user_id = auth.uid());

CREATE POLICY "owner_delete_users" ON argaman_users
  FOR DELETE TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "owner_read_all"          ON argaman_data;
DROP POLICY IF EXISTS "owner_write_all"         ON argaman_data;
DROP POLICY IF EXISTS "developer_write_public"  ON argaman_data;
DROP POLICY IF EXISTS "developer_update_public" ON argaman_data;

CREATE POLICY "owner_read_all" ON argaman_data FOR SELECT TO authenticated
  USING (public.is_owner());

CREATE POLICY "owner_write_all" ON argaman_data FOR ALL TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE POLICY "developer_write_public" ON argaman_data FOR INSERT TO authenticated
  WITH CHECK (
    key NOT IN (
      'argaman_clients','argaman_leads','argaman_sessions','argaman_outcomes',
      'argaman_risk_assessments','argaman_audit_log','argaman_voice_recordings',
      'argaman_genograms','argaman_time_logs','argaman_treatment_plans',
      'argaman_notifications','argaman_sticky_notes'
    )
  );

CREATE POLICY "developer_update_public" ON argaman_data FOR UPDATE TO authenticated
  USING (
    key NOT IN (
      'argaman_clients','argaman_leads','argaman_sessions','argaman_outcomes',
      'argaman_risk_assessments','argaman_audit_log','argaman_voice_recordings',
      'argaman_genograms','argaman_time_logs','argaman_treatment_plans',
      'argaman_notifications','argaman_sticky_notes'
    )
  );

DROP POLICY IF EXISTS "owner_read_all_login"   ON argaman_login_history;
DROP POLICY IF EXISTS "owner_read_all_actions" ON argaman_action_log;

CREATE POLICY "owner_read_all_login" ON argaman_login_history FOR SELECT TO authenticated
  USING (public.is_owner());

CREATE POLICY "owner_read_all_actions" ON argaman_action_log FOR SELECT TO authenticated
  USING (public.is_owner());

SELECT user_id, email, role, display_name FROM argaman_users;
