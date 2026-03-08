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
