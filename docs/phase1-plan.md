# Phase 1 Plan: UniHealth EHR MVP

**Horizon:** Months 1–6  
**Goal:** Core EHR for 5 pilot hospitals with **P95 &lt;50 ms** for patient + recent encounter lookup.

---

## 1. Scope

| Item                        | Description                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Pilot sites**             | 5 hospitals (2 large, 3 medium) + 1 regional lab (optional in first 3 months)                                |
| **In scope**                | Patient demographics, encounters, observations, medications, allergies; edge cache + warm store; Kafka sync |
| **Pilot extensions (repo)** | Staging compose, Keycloak OIDC, `AllergyIntolerance` ingest/read — see [phase1-staging.md](phase1-staging.md) |
| **Out of scope (Phase 1)**  | Full FHIR R5 validation, production consent engine, blockchain, federated learning, patient mobile app       |

## 2. Success Criteria

- **Latency:** P95 end-to-end for “patient + last N encounters” **&lt;50 ms** at pilot sites.
- **Interoperability:** No duplicate data entry for shared patients; data from Hospital A visible at Hospital B within **&lt;100 ms** of ingestion.
- **Availability:** 99.9% uptime for gateway and read path during pilot.

## 3. Deliverables

1. **Edge FHIR gateway** – Single read API: get patient + recent encounters (Redis → Postgres fallback).
2. **Event pipeline** – Kafka topics for Patient, Encounter, Observation, MedicationRequest; consumer that updates Redis (hot) and PostgreSQL (warm).
3. **Dev infrastructure** – Docker Compose: Kafka, Redis, PostgreSQL; one “edge” API service.
4. **Load test** – k6 script asserting P95 &lt;50 ms for the gateway.
5. **Seed data** – Script to load sample patients/encounters for testing.

## 4. Timeline (High-Level)

| Month | Focus                                                                                    |
| ----- | ---------------------------------------------------------------------------------------- |
| 1–2   | Repo, infra, gateway, load test; prove &lt;50 ms locally                                  |
| 3–4   | Edge pipeline; one pilot EMR adapter (HL7 v2 or FHIR); sync to Redis/Postgres            |
| 4–5   | Connect remaining pilots; simple consent check (facility/emergency)                      |
| 5–6   | Dual-write with existing system (if applicable); cutover; measure KPIs                    |

## 5. Repo Structure (Phase 1)

```
HEALTHCARE_SYSTEM/
├── docs/                           # All Markdown docs (see docs/README.md)
│   ├── UniHealth-EHR-Blueprint.md
│   ├── ehr-api.md, infra.md, frontend.md, …
│   └── phase1-plan.md
├── infra/
│   └── docker-compose.yml          # Kafka, Redis, PostgreSQL
├── ehr-api/                        # Edge FHIR gateway (Phase 1: FastAPI; later HAPI FHIR)
│   ├── app/
│   └── requirements.txt
├── edge-pipeline/                  # Kafka consumer → Redis + Postgres
│   ├── consumer/
│   └── requirements.txt
├── load-tests/
│   └── gateway-latency.js          # k6: P95 < 50ms
├── scripts/
│   └── seed_data.py                # Sample patients/encounters
└── README.md
```

## 6. First Milestone (Weeks 2–4)

- [x] `infra/` up: `docker-compose up -d` brings Kafka, Redis, Postgres up.
- [x] `ehr-api` running: `GET /fhir/r5/Patient/{id}/summary?encounters=5` returns patient + last 5 encounters.
- [x] Response served from Redis when cached; from Postgres on cache miss.
- [x] k6 run: P95 latency &lt;50 ms for 100 VUs, 30 s — see [benchmarks/phase1-baseline.md](benchmarks/phase1-baseline.md).

---

**Phase 1 sign-off:** [phase1-complete.md](phase1-complete.md) · `./scripts/smoke_phase1.sh` · `./scripts/verify_phase1_e2e.sh`
