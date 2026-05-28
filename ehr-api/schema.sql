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
