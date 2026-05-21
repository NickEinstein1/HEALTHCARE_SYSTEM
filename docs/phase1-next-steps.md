# Phase 1 — Status

**Phase 1 MVP is complete** in this repository. See **[phase1-complete.md](phase1-complete.md)** for sign-off, verification commands, and benchmark evidence.

## Done

- [x] Infra (Kafka, Redis, Postgres)
- [x] Edge FHIR gateway (patient + encounters, Redis → Postgres)
- [x] Event pipeline (Kafka consumer → Postgres/Redis)
- [x] Sample producer + seed data
- [x] k6 load test (P95 &lt;50 ms — documented PASS)
- [x] Pilot EMR ingestion API (Patient, Encounter, Observation, MedicationRequest)
- [x] Simple consent (grant/revoke + strict mode)
- [x] CI (lint, pytest, frontend build)
- [x] Smoke scripts: `scripts/smoke_phase1.sh`, `scripts/verify_phase1_e2e.sh`
- [x] Contract tests: `ehr-api/tests/test_phase1_fhir.py`

## Laptop staging (run everywhere on your machine / LAN)

1. `./scripts/run_staging.sh` — Docker stack on **:8100**
2. `./scripts/setup_frontend_staging.sh` && `cd frontend/app && npm run dev` — UI on **:5173**
3. [runbook-staging.md](runbook-staging.md) — tablet on Wi‑Fi, cloud VM, smoke checks

## Phase 2 (in progress — hospital onboarding later)

Platform work is underway; **per-hospital enrollment is deferred**.

| Priority | Item | Status |
| -------- | ---- | ------ |
| 1 | Production deploy (K8s, TLS) | Scaffolded — [phase2-production.md](phase2-production.md), `deploy/k8s/base/` |
| 2 | Production OIDC hardening | `EHR_DEPLOYMENT_ENV=production` profile |
| 3 | Patient mobile app MVP | Planned — [phase2-patient-app.md](phase2-patient-app.md) |
| 4 | National analytics aggregates | Scaffolded — [phase2-analytics.md](phase2-analytics.md) |
| 5 | FHIR `Consent` resource | API live — `GET/POST /fhir/r5/Consent` |

**Plan:** [phase2-plan.md](phase2-plan.md) · **Smoke:** `./scripts/smoke_phase2.sh`

Do **not** treat the in-repo **“Phase 3 AI Assist”** pilot as Blueprint Phase 3 — see root README and [UniHealth-EHR-Blueprint.md](UniHealth-EHR-Blueprint.md) §5.
