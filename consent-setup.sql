-- ═══════════════════════════════════════════════════════════════
-- argaman_consents — Explicit Client Consent Records
-- תיקון 13 compliance — חתימה דיגיטלית + hash chain לאי-שינוי
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS argaman_consents (
  id                      BIGSERIAL PRIMARY KEY,
  client_id               TEXT NOT NULL,
  client_name             TEXT NOT NULL,
  client_phone_last4      TEXT,                -- 4 ספרות אחרונות בלבד
  signature_canvas        TEXT NOT NULL,       -- Base64 PNG of signature
  consent_text_version    TEXT NOT NULL,       -- e.g. "v1.0"
  consent_text_hash       TEXT NOT NULL,       -- SHA-256 of the consent text shown
  ip_address              TEXT,                -- אופציונלי, anonymized (X.X.X.0)
  user_agent              TEXT,
  signed_at               TIMESTAMPTZ DEFAULT NOW(),
  signed_by_user_id       UUID REFERENCES auth.users(id),  -- מי הציג ללקוח
  previous_hash           TEXT,                -- hash של הרשומה הקודמת
  this_hash               TEXT NOT NULL UNIQUE -- SHA-256 of this row (chained)
);

CREATE INDEX IF NOT EXISTS idx_consents_client ON argaman_consents(client_id);
CREATE INDEX IF NOT EXISTS idx_consents_signed_at ON argaman_consents(signed_at DESC);

ALTER TABLE argaman_consents ENABLE ROW LEVEL SECURITY;

-- Only owner can read all
DROP POLICY IF EXISTS "owner_read_consents" ON argaman_consents;
CREATE POLICY "owner_read_consents" ON argaman_consents
  FOR SELECT TO authenticated USING (public.is_owner());

-- Only owner can insert (when collecting consent)
DROP POLICY IF EXISTS "owner_insert_consents" ON argaman_consents;
CREATE POLICY "owner_insert_consents" ON argaman_consents
  FOR INSERT TO authenticated WITH CHECK (public.is_owner());

-- NO UPDATE / DELETE — immutable
-- (אין policy → blocked automatically)

-- Trigger: prevent any modification or deletion
CREATE OR REPLACE FUNCTION prevent_consents_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'argaman_consents is append-only — consents cannot be modified or deleted (Article 13 compliance)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consents_immutable_update ON argaman_consents;
CREATE TRIGGER trg_consents_immutable_update
  BEFORE UPDATE ON argaman_consents
  FOR EACH ROW EXECUTE FUNCTION prevent_consents_modification();

DROP TRIGGER IF EXISTS trg_consents_immutable_delete ON argaman_consents;
CREATE TRIGGER trg_consents_immutable_delete
  BEFORE DELETE ON argaman_consents
  FOR EACH ROW EXECUTE FUNCTION prevent_consents_modification();

-- Verification query (run after first consent inserted)
-- SELECT id, client_name, signed_at, previous_hash, this_hash FROM argaman_consents ORDER BY id;
