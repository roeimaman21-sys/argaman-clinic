-- ═══════════════════════════════════════════════════════════════
-- Argaman Clinic — Multi-user authentication migration
-- ───────────────────────────────────────────────────────────────
-- Run this ONCE in Supabase SQL Editor (Dashboard → SQL Editor)
-- Date: 2026-05-18
-- ═══════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────
-- 1. Create argaman_users table — links auth.users to roles
-- ───────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────
-- 2. Enable RLS on argaman_users itself
-- ───────────────────────────────────────────────────────────────
ALTER TABLE argaman_users ENABLE ROW LEVEL SECURITY;

-- Each user can read their own row (for role lookup)
DROP POLICY IF EXISTS "users_read_own" ON argaman_users;
CREATE POLICY "users_read_own"
  ON argaman_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Owners can read all rows (to see who has access)
DROP POLICY IF EXISTS "owners_read_all" ON argaman_users;
CREATE POLICY "owners_read_all"
  ON argaman_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM argaman_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Only owners can insert/update/delete (manage staff)
DROP POLICY IF EXISTS "owners_manage_users" ON argaman_users;
CREATE POLICY "owners_manage_users"
  ON argaman_users FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM argaman_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ───────────────────────────────────────────────────────────────
-- 3. Add timestamp columns to argaman_data for conflict detection
-- ───────────────────────────────────────────────────────────────
ALTER TABLE argaman_data
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Auto-update updated_at on every change
CREATE OR REPLACE FUNCTION update_argaman_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_argaman_data_updated_at ON argaman_data;
CREATE TRIGGER trg_argaman_data_updated_at
  BEFORE INSERT OR UPDATE ON argaman_data
  FOR EACH ROW
  EXECUTE FUNCTION update_argaman_data_timestamp();

-- ───────────────────────────────────────────────────────────────
-- 4. Enable Supabase Realtime on argaman_data
-- ───────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE argaman_data;

-- ───────────────────────────────────────────────────────────────
-- 5. Bootstrap: Insert the 2 initial users
-- IMPORTANT: First create them in Supabase Dashboard → Authentication → Users
--            with email + password. Then run this section.
-- ───────────────────────────────────────────────────────────────
-- Replace these UUIDs with the actual user_ids from auth.users after creation:
--   1. Go to Authentication → Users → click on Gal's row → copy UID
--   2. Same for developer
--   3. Paste UIDs below and run

-- Example (replace UUIDs!):
-- INSERT INTO argaman_users (user_id, email, role, display_name, can_see_phi)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'argamanclinic@gmail.com', 'owner', 'גל ממן', TRUE),
--   ('00000000-0000-0000-0000-000000000002', 'roeimaman21@gmail.com', 'developer', 'רועי ממן (DEV)', FALSE)
-- ON CONFLICT (user_id) DO UPDATE
-- SET email = EXCLUDED.email,
--     role = EXCLUDED.role,
--     display_name = EXCLUDED.display_name,
--     can_see_phi = EXCLUDED.can_see_phi,
--     updated_at = NOW();

-- ───────────────────────────────────────────────────────────────
-- DONE. Next: Run rls-policies.sql to set access control on data.
-- ───────────────────────────────────────────────────────────────
