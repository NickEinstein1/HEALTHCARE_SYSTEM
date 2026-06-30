-- UniHealth EHR Phase 1 - Warm store schema (PostgreSQL)
-- Run once after postgres is up: psql -U ehr -d ehr -f schema.sql

CREATE TABLE IF NOT EXISTS patients (
    id              VARCHAR(64) PRIMARY KEY,
    nhi_number      VARCHAR(32) UNIQUE NOT NULL,
    family_name     VARCHAR(128),
    given_name      VARCHAR(128),
    birth_date      DATE,
    gender          VARCHAR(16),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS encounters (
    id              VARCHAR(64) PRIMARY KEY,
    patient_id      VARCHAR(64) NOT NULL REFERENCES patients(id),
    facility_id     VARCHAR(64) NOT NULL,
    facility_name   VARCHAR(256),
    status          VARCHAR(32) NOT NULL DEFAULT 'finished',
    class_code      VARCHAR(32),
    period_start    TIMESTAMPTZ,
    period_end      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_encounters_patient_id ON encounters(patient_id);
CREATE INDEX IF NOT EXISTS idx_encounters_patient_period ON encounters(patient_id, period_start DESC);

-- Consent (Phase 1: simple facility/scope allow list)
CREATE TABLE IF NOT EXISTS consents (
    id              BIGSERIAL PRIMARY KEY,
    patient_id      VARCHAR(64) NOT NULL REFERENCES patients(id),
    facility_id     VARCHAR(64) NOT NULL,
    scope           VARCHAR(32) NOT NULL, -- treatment | emergency | research | analytics (Phase 1 uses treatment/emergency)
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    granted_at      TIMESTAMPTZ DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consents_patient_facility_scope
    ON consents(patient_id, facility_id, scope)
    WHERE active = TRUE;

-- Observations (Phase 1: store raw resource + minimal indexed fields)
CREATE TABLE IF NOT EXISTS observations (
    id              VARCHAR(64) PRIMARY KEY,
    patient_id      VARCHAR(64) NOT NULL REFERENCES patients(id),
    code            VARCHAR(128),
    effective_time  TIMESTAMPTZ,
    value_text      VARCHAR(256),
    unit            VARCHAR(64),
    resource_json   JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observations_patient_time
    ON observations(patient_id, effective_time DESC);

-- MedicationRequest (Phase 1: store raw resource + minimal indexed fields)
CREATE TABLE IF NOT EXISTS medication_requests (
    id              VARCHAR(64) PRIMARY KEY,
    patient_id      VARCHAR(64) NOT NULL REFERENCES patients(id),
    medication_code VARCHAR(128),
    status          VARCHAR(32),
    authored_on     TIMESTAMPTZ,
    dosage_text     VARCHAR(256),
    resource_json   JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medreq_patient_time
    ON medication_requests(patient_id, authored_on DESC);

-- AllergyIntolerance (Phase 1 — Blueprint sync)
CREATE TABLE IF NOT EXISTS allergy_intolerances (
    id              VARCHAR(64) PRIMARY KEY,
    patient_id      VARCHAR(64) NOT NULL REFERENCES patients(id),
    code            VARCHAR(128),
    substance_text  VARCHAR(256),
    clinical_status VARCHAR(32),
    criticality     VARCHAR(32),
    recorded_date   TIMESTAMPTZ,
    resource_json   JSONB NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allergy_patient_date
    ON allergy_intolerances(patient_id, recorded_date DESC);

-- Phase 3 AI Assist pilot — durable anomaly store (optional; used when Postgres enabled)
CREATE TABLE IF NOT EXISTS ai_anomalies (
    id              VARCHAR(128) PRIMARY KEY,
    patient_id      VARCHAR(64) NOT NULL,
    metric          VARCHAR(64),
    value           DOUBLE PRECISION,
    severity        VARCHAR(16),
    msg             VARCHAR(512),
    type            VARCHAR(64),
    model_version   VARCHAR(32),
    generated_at    TIMESTAMPTZ,
    acknowledged    BOOLEAN NOT NULL DEFAULT FALSE,
    ack_by          VARCHAR(32),
    ack_ts          TIMESTAMPTZ,
    ack_note        VARCHAR(512),
    payload_json    TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_anomalies_patient_time
    ON ai_anomalies(patient_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_anomalies_ack
    ON ai_anomalies(acknowledged, generated_at DESC);

-- Phase 3 AI Assist pilot — KDPA audit log durability (optional; admin-only read)
CREATE TABLE IF NOT EXISTS ai_audit_log (
    audit_id        VARCHAR(128) PRIMARY KEY,
    event           VARCHAR(128) NOT NULL,
    role            VARCHAR(32) NOT NULL,
    patient_id      VARCHAR(64),
    model_version   VARCHAR(32),
    payload_json    TEXT NOT NULL,
    ts              TIMESTAMPTZ,
    feedback_json   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_ts
    ON ai_audit_log(ts DESC);

CREATE INDEX IF NOT EXISTS idx_ai_audit_event_ts
    ON ai_audit_log(event, ts DESC);

-- Tier C: facility-confirmed outcome labels (overrides proxy labels in ML export when present)
CREATE TABLE IF NOT EXISTS ml_patient_outcome_labels (
    id                      BIGSERIAL PRIMARY KEY,
    patient_id              VARCHAR(64) NOT NULL REFERENCES patients(id),
    facility_id             VARCHAR(64) NOT NULL,
    outcome_readmission_30d SMALLINT CHECK (outcome_readmission_30d IN (0, 1)),
    outcome_deterioration_7d SMALLINT CHECK (outcome_deterioration_7d IN (0, 1)),
    outcome_icu_transfer_30d SMALLINT,
    effective_day           DATE NOT NULL DEFAULT CURRENT_DATE,
    label_source            VARCHAR(64) NOT NULL DEFAULT 'facility_csv_v1',
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (patient_id, facility_id, effective_day)
);

CREATE INDEX IF NOT EXISTS idx_ml_labels_patient_facility
    ON ml_patient_outcome_labels(patient_id, facility_id, effective_day DESC);

-- Pilot staff accounts (Keycloak sync + registration pipeline)
CREATE TABLE IF NOT EXISTS pilot_staff_accounts (
    username        VARCHAR(64) PRIMARY KEY,
    role            VARCHAR(32) NOT NULL,
    email           VARCHAR(256) NOT NULL,
    display_name    VARCHAR(256) NOT NULL,
    facility_id     VARCHAR(64) NOT NULL DEFAULT 'FAC-A',
    reg_identifier  VARCHAR(64),
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    keycloak_synced BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pilot_staff_role ON pilot_staff_accounts(role) WHERE enabled = TRUE;

-- Clinical AI assessments (LLM / rules differential diagnosis support)
CREATE TABLE IF NOT EXISTS clinical_ai_assessments (
    assessment_id   VARCHAR(128) PRIMARY KEY,
    patient_id      VARCHAR(64) NOT NULL,
    role            VARCHAR(32) NOT NULL,
    provider        VARCHAR(64) NOT NULL,
    model_version   VARCHAR(64),
    request_json    TEXT NOT NULL,
    response_json   TEXT NOT NULL,
    audit_id        VARCHAR(128),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_ai_patient_ts
    ON clinical_ai_assessments(patient_id, created_at DESC);

-- Legal document e-signing (POA, surgical consent, emergency consent)
CREATE TABLE IF NOT EXISTS legal_documents (
    id                  VARCHAR(128) PRIMARY KEY,
    patient_id          VARCHAR(64) NOT NULL REFERENCES patients(id),
    encounter_id        VARCHAR(64),
    facility_id         VARCHAR(64) NOT NULL DEFAULT 'FAC-A',
    doc_type            VARCHAR(64) NOT NULL,
    template_version    VARCHAR(32) NOT NULL,
    title               VARCHAR(256) NOT NULL,
    body                TEXT NOT NULL,
    summary             TEXT,
    required_signers    TEXT NOT NULL,
    status              VARCHAR(32) NOT NULL DEFAULT 'pending_signatures',
    context_json        TEXT,
    verification_code   VARCHAR(32),
    created_by_role     VARCHAR(32) NOT NULL,
    created_by_subject  VARCHAR(128),
    signatures_json     TEXT NOT NULL DEFAULT '[]',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ,
    voided_at           TIMESTAMPTZ,
    void_reason         TEXT
);

CREATE INDEX IF NOT EXISTS idx_legal_docs_patient
    ON legal_documents(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legal_docs_status
    ON legal_documents(status, created_at DESC);

CREATE TABLE IF NOT EXISTS legal_document_audit_log (
    audit_id        VARCHAR(128) PRIMARY KEY,
    document_id     VARCHAR(128) NOT NULL,
    event           VARCHAR(64) NOT NULL,
    role            VARCHAR(32) NOT NULL,
    subject         VARCHAR(128),
    payload_json    TEXT NOT NULL,
    ts              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_audit_doc
    ON legal_document_audit_log(document_id, ts DESC);

-- Billing & M-Pesa payments (Phase 2 pilot)
CREATE TABLE IF NOT EXISTS billing_invoices (
    id              VARCHAR(64) PRIMARY KEY,
    patient_id      VARCHAR(64) NOT NULL REFERENCES patients(id),
    patient_name    VARCHAR(256),
    facility_id     VARCHAR(64) NOT NULL DEFAULT 'FAC-A',
    description     VARCHAR(512) NOT NULL,
    amount_kes      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_kes     NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status          VARCHAR(32) NOT NULL DEFAULT 'issued',
    issued_at       TIMESTAMPTZ DEFAULT NOW(),
    due_at          TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_by_role VARCHAR(32) NOT NULL DEFAULT 'billing',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_patient
    ON billing_invoices(patient_id, issued_at DESC);

CREATE TABLE IF NOT EXISTS billing_payments (
    id              VARCHAR(64) PRIMARY KEY,
    invoice_id      VARCHAR(64) REFERENCES billing_invoices(id),
    patient_id      VARCHAR(64) NOT NULL REFERENCES patients(id),
    patient_name    VARCHAR(256),
    method          VARCHAR(32) NOT NULL,
    purpose         VARCHAR(32) NOT NULL,
    amount_kes      NUMERIC(12, 2) NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'pending',
    mpesa_receipt   VARCHAR(64),
    phone           VARCHAR(32),
    recorded_by_role VARCHAR(32) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_billing_payments_patient
    ON billing_payments(patient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id                  VARCHAR(64) PRIMARY KEY,
    checkout_request_id VARCHAR(128),
    merchant_request_id VARCHAR(128),
    payment_id          VARCHAR(64) REFERENCES billing_payments(id),
    patient_id          VARCHAR(64) NOT NULL REFERENCES patients(id),
    invoice_id          VARCHAR(64) REFERENCES billing_invoices(id),
    purpose             VARCHAR(32) NOT NULL,
    amount_kes          NUMERIC(12, 2) NOT NULL,
    phone               VARCHAR(32),
    status              VARCHAR(32) NOT NULL DEFAULT 'pending',
    mpesa_receipt       VARCHAR(64),
    initiated_by_role   VARCHAR(32) NOT NULL,
    result_desc         VARCHAR(512),
    raw_json            TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mpesa_tx_patient
    ON mpesa_transactions(patient_id, created_at DESC);
