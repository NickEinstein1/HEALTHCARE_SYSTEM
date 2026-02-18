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
