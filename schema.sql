-- EXECUTIA™ — Cases Schema
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS cases (
  id                  TEXT PRIMARY KEY,

  -- Submission
  name                TEXT,
  company             TEXT,
  role                TEXT,
  email               TEXT NOT NULL,
  phone               TEXT,
  process_type        TEXT,
  country             TEXT,
  operator_name       TEXT,
  process_value       TEXT,
  main_risk           TEXT,
  consequence         TEXT,
  context             TEXT,
  source              TEXT,   -- execution_demo | request_form | operator

  -- Engine output
  risk_score          INTEGER,
  exposure            TEXT,
  verdict             TEXT,   -- APPROVED | REQUIRES REVIEW | BLOCKED
  lifecycle           TEXT,   -- IN CONTROL | UNDER REVIEW | HALTED

  -- Lifecycle
  status              TEXT NOT NULL DEFAULT 'pending',
  operator_note       TEXT,
  reviewed_by         TEXT,
  reviewed_at         TIMESTAMPTZ,
  client_email_sent   BOOLEAN,
  operator_email_sent BOOLEAN,
  archived_at         TIMESTAMPTZ,

  -- Trace
  trace               JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Meta
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints — enforce system vocabulary
ALTER TABLE cases
  DROP CONSTRAINT IF EXISTS cases_verdict_check;
ALTER TABLE cases
  ADD CONSTRAINT cases_verdict_check
  CHECK (verdict IS NULL OR verdict IN ('APPROVED', 'REQUIRES REVIEW', 'BLOCKED'));

ALTER TABLE cases
  DROP CONSTRAINT IF EXISTS cases_lifecycle_check;
ALTER TABLE cases
  ADD CONSTRAINT cases_lifecycle_check
  CHECK (lifecycle IS NULL OR lifecycle IN ('IN CONTROL', 'UNDER REVIEW', 'HALTED'));

ALTER TABLE cases
  DROP CONSTRAINT IF EXISTS cases_status_check;
ALTER TABLE cases
  ADD CONSTRAINT cases_status_check
  CHECK (status IN ('pending', 'under_review', 'approved', 'blocked', 'closed', 'execution_record'));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cases_updated_at ON cases;
CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cases_email        ON cases (email);
CREATE INDEX IF NOT EXISTS idx_cases_status       ON cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_created      ON cases (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_verdict      ON cases (verdict);
CREATE INDEX IF NOT EXISTS idx_cases_country      ON cases (country);
CREATE INDEX IF NOT EXISTS idx_cases_process_type ON cases (process_type);

-- RLS: service role only
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_all" ON cases;
CREATE POLICY "service_all"
  ON cases FOR ALL TO service_role
  USING (true) WITH CHECK (true);
