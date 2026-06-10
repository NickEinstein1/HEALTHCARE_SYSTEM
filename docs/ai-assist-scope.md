# UniHealth AI Assist — scope and limitations

This document describes the **in-repo Phase 3 AI Assist pilot** (`ehr-api` `/ai/*`). It is **not** the strategic Blueprint Phase 3 (federated learning, NLP scribes, imaging AI).

## What it is

- **Clinical decision support (CDS)** using **deterministic, auditable rules** (`model_version`: `rule-v2.1.0`).
- **NEWS2** early warning scoring from vitals.
- **Anomaly detection**: hard clinical thresholds, optional z-score vs patient baseline, composite NEWS2 alerts.
- **Drug–drug interaction** checks (substring match on medication names).
- **Ward occupancy pilot**: in-memory simulator + simple bed-demand forecast (staff only).
- **KDPA-oriented audit** of AI events and clinician feedback on hints.

## Who can use what

| Audience | Routes | Not exposed |
|----------|--------|-------------|
| **Doctor / nurse / admin** | Diagnosis hints, **deterioration risk band** (`POST /ai/risk-score`, rules), anomaly check, anomalies inbox, NEWS2, wards/forecast/census, WebSocket alerts, audit (admin) | — |
| **Patient** | `POST /ai/patient/insights`, `GET /ai/patient/alerts` | Ward forecast, census, simulator patients |
| **Integration** | Census/HL7 (secret-gated) | Patient-facing ward data |

## Data sources

1. **FHIR warm store** (Redis cache → Postgres): observations, medication requests — used when `patient_id` + `use_fhir` (default true).
2. **Simulator** (`SIM-*`): vitals time series, ward state — demos and training only.
3. **Request body** overrides FHIR-parsed features on conflict.

## What it does *not* do

- Does **not** replace clinician judgment (see `disclaimer` on diagnosis hints).
- Does **not** use trained ML models for diagnosis (rule confidence scores are **not** calibrated probabilities).
- Does **not** read imaging, free-text notes, or unstructured PDFs.
- Does **not** guarantee completeness if FHIR observations are missing or unparsed.

## Patient safety

- Patient endpoints return **sanitized** copy (no ward/capacity/ICU language where possible).
- Alerts are **read-only** for patients; acknowledgment is staff-only.

## Operations

- **Smoke**: `EHR_GATEWAY_URL=http://localhost:8100 ./scripts/smoke_phase3_ai.sh`
- **Local CI mirror**: `./scripts/ci_check.sh`
- **Demo clinical data for P001**: `./scripts/seed_staging_db.sh` (after `./scripts/run_staging.sh`)
- **Production**: see [ai-production-runbook.md](ai-production-runbook.md)

## Roadmap (Tier C)

Machine learning (readmission/deterioration risk) is scoped under `ml/` with separate governance — see [ml/README.md](../ml/README.md).
