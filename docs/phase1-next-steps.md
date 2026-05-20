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

## What to run next (Blueprint Phase 2)

| Priority | Item                                                       |
| -------- | ---------------------------------------------------------- |
| 1        | Production deploy pattern (K8s/K3s edge, TLS reverse proxy) |
| 2        | Production OIDC hardening (mTLS, no password grant, no header fallback) |
| 3        | Patient mobile app MVP                                     |
| 4        | National analytics aggregates pipeline                     |
| 5        | Consent engine hardening (FHIR `Consent` resource)         |

Do **not** treat the in-repo **“Phase 3 AI Assist”** pilot as Blueprint Phase 3 — see root README and [UniHealth-EHR-Blueprint.md](UniHealth-EHR-Blueprint.md) §5.
