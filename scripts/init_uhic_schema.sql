-- UHIC — UniHealth Insurance Cover schema (PostgreSQL)
-- Reference from UniHealth Insurance Cover 2.0.docx
-- Cross-schema FKs into clinical.* enforce phantom-claim prevention.

CREATE SCHEMA IF NOT EXISTS insurance;

CREATE TABLE IF NOT EXISTS insurance.members (
  member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL UNIQUE REFERENCES clinical.patients(id),
  household_id UUID,
  national_id VARCHAR(20),
  biometric_ref VARCHAR(255),
  scheme_type VARCHAR(20) NOT NULL CHECK (scheme_type IN ('SHIF', 'PHF', 'ECCIF', 'private', 'corporate')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (national_id, scheme_type)
);

CREATE TABLE IF NOT EXISTS insurance.policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_type VARCHAR(20) NOT NULL,
  benefit_package_id UUID,
  member_id UUID NOT NULL REFERENCES insurance.members(member_id),
  effective_from DATE NOT NULL,
  effective_to DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS insurance.claims (
  claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES insurance.members(member_id),
  encounter_id UUID NOT NULL REFERENCES clinical.encounters(id),
  provider_id VARCHAR(64) NOT NULL,
  submitted_amount_kes NUMERIC(12, 2) NOT NULL,
  adjudicated_amount_kes NUMERIC(12, 2),
  status VARCHAR(20) NOT NULL DEFAULT 'submitted',
  fraud_score SMALLINT DEFAULT 0,
  fraud_reasons JSONB DEFAULT '[]',
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurance.premium_ledger (
  ledger_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES insurance.policies(policy_id),
  amount_kes NUMERIC(12, 2) NOT NULL,
  channel VARCHAR(32),
  remittance_ref VARCHAR(128),
  penalty_flag BOOLEAN DEFAULT FALSE,
  paid_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurance.provider_risk_scores (
  provider_id VARCHAR(64) PRIMARY KEY,
  fraud_score SMALLINT NOT NULL,
  outlier_flags JSONB DEFAULT '[]',
  rejection_rate_pct NUMERIC(5, 2),
  avg_claim_kes NUMERIC(12, 2),
  last_review TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS insurance.claim_audit_log (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event VARCHAR(64) NOT NULL,
  claim_id UUID,
  payload JSONB,
  prev_hash VARCHAR(64),
  hash VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_encounter ON insurance.claims(encounter_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance.claims(status);
