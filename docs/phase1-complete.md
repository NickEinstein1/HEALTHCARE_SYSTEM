# Phase 1 — Complete (sign-off)

**Status:** MVP deliverables implemented in this repository.  
**Target:** P95 &lt;50 ms for `GET /fhir/r5/Patient/{id}/summary` at pilot edge nodes.

## Deliverables

| #   | Deliverable                            | Location                                                                                                                 |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Edge FHIR gateway (Redis → Postgres)   | [ehr-api/](../ehr-api/)                                                                                                  |
| 2   | Kafka consumer → Postgres + Redis      | [edge-pipeline/](../edge-pipeline/)                                                                                      |
| 3   | Dev infra (Kafka, Redis, Postgres)     | [infra/docker-compose.yml](../infra/docker-compose.yml)                                                                  |
| 4   | k6 load test (P95 &lt;50 ms threshold) | [load-tests/gateway-latency.js](../load-tests/gateway-latency.js)                                                        |
| 5   | Seed + sample producer                 | [scripts/seed_data.py](../scripts/seed_data.py), [scripts/produce_sample_events.py](../scripts/produce_sample_events.py) |

## Also shipped (Phase 1 extensions)

- HTTP ingest: `POST /fhir/r5/Patient`, `Encounter`, `Observation`, `MedicationRequest`, `AllergyIntolerance` → Kafka
- Read APIs: observations, medication-requests, allergy-intolerances (cached)
- Consent grant/revoke + optional **strict** mode (`EHR_CONSENT_MODE`)
- Metrics: `/metrics/json`, per-request `X-Request-Latency-Ms`, `X-Cache-Source`
- CI: lint + pytest + frontend build ([.github/workflows/ci.yml](../.github/workflows/ci.yml))

## Explicitly out of scope (per plan)

- HAPI FHIR R5 server (FastAPI gateway stands in; see ehr-api README)
- NHI IC card + production-grade OIDC (pilot Keycloak stack: [phase1-staging.md](phase1-staging.md))
- Blockchain, federated learning, patient mobile app

## Verification commands

**One-shot local stack:**

```bash
./scripts/run_full_flow.sh
```

**Read-path smoke** (gateway running, data loaded):

```bash
./scripts/smoke_phase1.sh
# or: EHR_GATEWAY_URL=http://localhost:8100 ./scripts/smoke_phase1.sh
```

**Full ingest E2E** (gateway + consumer + Kafka):

```bash
./scripts/verify_phase1_e2e.sh
```

**Latency benchmark** (requires [k6](https://k6.io)):

```bash
BASE_URL=http://localhost:8100 VUS=100 DURATION=30s k6 run load-tests/gateway-latency.js
```

Recorded baseline: [benchmarks/phase1-baseline.md](benchmarks/phase1-baseline.md) (P95 **30.43 ms**, PASS).

**Staging stack** (gateway + consumer + Keycloak):

```bash
docker compose -f infra/docker-compose.staging.yml --env-file infra/.env.staging up -d --build
./scripts/smoke_staging.sh
```

**Automated contracts** (no Docker):

```bash
cd ehr-api && PYTHONPATH=. pytest tests/ -q
pytest -q tests   # consumer parser unit tests at repo root
```

## Success criteria checklist

| Criterion                                 | Evidence                                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P95 &lt;50 ms summary                     | k6 PASS in [phase1-baseline.md](benchmarks/phase1-baseline.md)                                 |
| Event-driven sync (no duplicate entry path) | [phase1-e2e-verification.md](benchmarks/phase1-e2e-verification.md), `verify_phase1_e2e.sh`  |
| Redis cache on warm reads                 | `X-Cache-Source: redis-hit` in `smoke_phase1.sh`                                               |
| 99.9% uptime                              | Operational target for pilot deploy (not CI-gated)                                             |

## Next program phase

Proceed to **Blueprint Phase 2** (national scale, consent hardening, patient app, analytics) — see [UniHealth-EHR-Blueprint.md](UniHealth-EHR-Blueprint.md) §5.

The repo’s **“Phase 3 AI Assist”** pilot is an edge feature slice and is **not** Blueprint Phase 3 completion.
