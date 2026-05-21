# EHR API – Edge FHIR Gateway (Phase 1)

Phase 1 implementation of the UniHealth EHR edge gateway. Serves **patient + recent encounters** with a **P95 &lt;50 ms** target by reading from Redis first, then PostgreSQL.

## Endpoints

- **GET** `/fhir/r5/Patient/{patient_id}/summary?encounters=5`  
  Returns patient demographics and last N encounters (FHIR-style JSON).  
  Cache-first; on miss loads from DB and backfills cache.

- **POST** `/fhir/r5/Patient` – Ingest patient (pilot EMR). Body: FHIR-style Patient JSON (`id` required). Publishes to Kafka → consumer updates Postgres/Redis.

- **POST** `/fhir/r5/Encounter` – Ingest encounter (pilot EMR). Body: FHIR-style Encounter JSON (`id`, `patient_id` or `subject.reference` required). Publishes to Kafka.

- **POST** `/fhir/r5/Observation` – Ingest observation. Body requires `id` and `patient_id` (or `subject.reference`). Publishes to Kafka.

- **POST** `/fhir/r5/MedicationRequest` – Ingest medication request. Body requires `id` and `patient_id` (or `subject.reference`). Publishes to Kafka.

- **GET** `/fhir/r5/Patient/{patient_id}/observations?limit=20` – Read observations (Redis → Postgres).

- **GET** `/fhir/r5/Patient/{patient_id}/medication-requests?limit=20` – Read medication requests (Redis → Postgres).

## Consent (Phase 1)

Consent is **optional by default** (`EHR_CONSENT_MODE=permissive`). If you set `EHR_CONSENT_MODE=strict`, reads will be denied unless an active consent exists for the requested facility (via header `X-Facility-Id`).

- Grant:

```bash
curl -s -X POST http://localhost:8000/consent/grant \\
  -H "Content-Type: application/json" \\
  -d '{"patient_id":"P001","facility_id":"FAC-A","scope":"treatment"}'
```

- Revoke:

```bash
curl -s -X POST http://localhost:8000/consent/revoke \\
  -H "Content-Type: application/json" \\
  -d '{"patient_id":"P001","facility_id":"FAC-A","scope":"treatment"}'
```

## Run locally

1. Start infra (from repo root):

   ```bash
   cd infra && docker compose up -d && cd ..
   ```

2. Create DB schema and seed data:

   ```bash
   psql -U ehr -d ehr -h localhost -f ehr-api/schema.sql
   python scripts/seed_data.py
   ```

3. Install and run API:

   ```bash
   cd ehr-api
   python -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```

4. Test:

   ```bash
   curl http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5
   ```

## Testing — Phase 3 AI Assist pilot

Runs **without Redis/Postgres** for simulator tests (`/ai` router + census idempotency):

```bash
cd ehr-api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=. pytest tests/ -q
```

## Environment

| Variable                          | Default                                 | Description                                                                                                                                                                                                                     |
| --------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EHR_REDIS_URL                     | redis://localhost:6379/0                | Redis connection                                                                                                                                                                                                                |
| EHR_INTEGRATION_IDEMPOTENCY_REDIS | false                                   | When `true`, integration census/HL7 idempotency replays are stored in Redis (same URL) so **multiple API workers or replicas** see the same cached response; when `false`, replay is **in-process memory only** (single worker) |
| EHR_POSTGRES_DSN                  | postgresql://ehr:...@localhost:5432/ehr | PostgreSQL connection                                                                                                                                                                                                           |
| EHR_CACHE_TTL_SECONDS             | 300                                     | Cache TTL for patient summary                                                                                                                                                                                                   |
| EHR_AI_CENSUS_INTEGRATION_SECRET  | _(empty)_                               | When set: enables integration POST routes (`/ai/integration/...`, including HL7 ADT stub); send header `X-AI-Census-Secret`; empty = **404** on those paths                                                                     |
| EHR_WARD_CENSUS_SQLITE_PATH       | _(empty)_                               | When set: each appended census snapshot is also written to this SQLite file (WAL mode); survives process restarts for pilot durability                                                                                          |
| EHR_REPLAY_WARD_CENSUS_SQLITE     | false                                   | When `true` **and** `EHR_WARD_CENSUS_SQLITE_PATH` is set: on API startup, tail rows from SQLite are merged into in-memory census history before recomputing forecasts                                                           |

Automation census **example** (after setting the secret in the gateway environment):

```bash
curl -s -X POST "http://localhost:8000/ai/integration/wards/WARD-A/census-snapshot" \
  -H "Content-Type: application/json" \
  -H "X-AI-Census-Secret: YOUR_SECRET" \
  -d '{"occupied":12,"source":"hl7/ADT_A01_facility_JOB","idempotency_key":"job-run-uuid"}'
```

Optional JSON field ``idempotency_key``: duplicate POSTs within ~7 days (single process) replay the first JSON response with ``"idempotent_replay": true`` — use for retried feeders.

**HL7 ADT pilot** (±1 census heuristic; same secret header):

```bash
curl -s -X POST "http://localhost:8000/ai/integration/hl7/adt" \
  -H "Content-Type: application/json" \
  -H "X-AI-Census-Secret: YOUR_SECRET" \
  -d '{"message":"MSH|^~\\\&|S|R|UH|UH|202601011200||ADT^A01|x|P|2.5\rPV1|1|I|WARD-A","ward_id_override":"WARD-A"}'
```

Use JSON field ``message`` (alias ``raw``) for ER7 text. Optional ``ward_id_override`` if PV1-3 does not include a simulated ward token. Optional ``idempotency_key``; otherwise the inferred **MSH-10** adjacent to ``ADT^…`` dedupes repeats. Non-delta ADT triggers return ``{"status":"ignored"}``.

## Kenya KMHFL directory (Admin facilities)

Proxy: `GET /integrations/kmhfl/facilities` — upstream **`https://api.kmhfr.health.go.ke`** (not the legacy `kmhfl.health.go.ke` UI host).

| Variable | Purpose |
| -------- | ------- |
| `KMHFL_BASE_URL` | API host (default `https://api.kmhfr.health.go.ke`) |
| `KMHFL_USE_DEMO_FALLBACK` | `true` = pilot sample facilities when MOH token missing (default in staging) |
| `KMHFL_API_TOKEN` | Django REST token (`Authorization: Token …`) |
| `KMHFL_USERNAME` / `KMHFL_PASSWORD` | Login via `/api/rest-auth/login/` (email + password) |

## Later (Phase 2+)

This service is intended to be replaced or wrapped by **HAPI FHIR R5** for full FHIR compliance; the latency pattern (Redis → Postgres) remains the same.
