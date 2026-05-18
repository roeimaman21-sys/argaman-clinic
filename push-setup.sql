-- ═══════════════════════════════════════════════════════════════
-- Web Push subscriptions table + WhatsApp inbox table
-- Run once in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════

-- Push subscriptions
CREATE TABLE IF NOT EXISTS argaman_push_subscriptions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  keys        JSONB NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE argaman_push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self_manage_push" ON argaman_push_subscriptions;
CREATE POLICY "self_manage_push" ON argaman_push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owner_read_all_push" ON argaman_push_subscriptions;
CREATE POLICY "owner_read_all_push" ON argaman_push_subscriptions
  FOR SELECT TO authenticated
  USING (public.is_owner());

-- WhatsApp inbox (for incoming messages via webhook)
CREATE TABLE IF NOT EXISTS argaman_whatsapp_inbox (
  id            BIGSERIAL PRIMARY KEY,
  from_phone    TEXT NOT NULL,
  to_phone      TEXT,
  body          TEXT,
  media_url     TEXT,
  twilio_sid    TEXT UNIQUE,
  meta          JSONB,
  processed     BOOLEAN DEFAULT FALSE,
  lead_id       TEXT,
  received_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_inbox_received ON argaman_whatsapp_inbox(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_inbox_phone ON argaman_whatsapp_inbox(from_phone);

ALTER TABLE argaman_whatsapp_inbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_inbox" ON argaman_whatsapp_inbox;
CREATE POLICY "owner_read_inbox" ON argaman_whatsapp_inbox
  FOR SELECT TO authenticated USING (public.is_owner());

DROP POLICY IF EXISTS "owner_update_inbox" ON argaman_whatsapp_inbox;
CREATE POLICY "owner_update_inbox" ON argaman_whatsapp_inbox
  FOR UPDATE TO authenticated USING (public.is_owner());

-- service_role can insert (used by webhook Edge Function)
-- (no policy needed — service_role bypasses RLS)

SELECT 'push subscriptions' AS table_name, COUNT(*) AS rows FROM argaman_push_subscriptions
UNION ALL
SELECT 'wa inbox', COUNT(*) FROM argaman_whatsapp_inbox;
