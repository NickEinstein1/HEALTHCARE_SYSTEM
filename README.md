# UniHealth EHR

Next-generation national Electronic Health Record system (see [Blueprint](docs/UniHealth-EHR-Blueprint.md)). This repo contains **Phase 1: MVP** — edge FHIR gateway, event pipeline, and load tests targeting **P95 &lt;50 ms** for patient + recent encounter lookup.

## Phase 1 quick start

**One-shot full flow (after Docker is running):**

```bash
./scripts/run_full_flow.sh
```

Then open <http://localhost:8000/docs> or run:
`curl -H "X-Facility-Id: FAC-A" http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5`

**Manual steps:**

### 1. Start infrastructure

```bash
cd infra && docker compose up -d && cd ..
```

### 2. Database schema and seed data

```bash
psql -U ehr -d ehr -h localhost -f ehr-api/schema.sql
cd ehr-api && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cd ..
# Seed from repo root with ehr-api venv active (so asyncpg is available)
source ehr-api/.venv/bin/activate && python scripts/seed_data.py
```

### 3. Run the EHR gateway

```bash
cd ehr-api && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

### 4. Test

```bash
curl -H "X-Facility-Id: FAC-A" http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5
```

### 5. Load test (P95 &lt;50 ms)

Install [k6](https://k6.io), then:

```bash
k6 run load-tests/gateway-latency.js
```

## Full flow (event-driven path)

To test the full pipeline **Kafka → consumer → Postgres/Redis → gateway** (no direct DB seed):

1. Start infra and apply schema (no `seed_data.py`):

   ```bash
   cd infra && docker compose up -d && cd ..
   psql -U ehr -d ehr -h localhost -f ehr-api/schema.sql
   ```

2. Start the **consumer** (in one terminal; it will wait for events):

   ```bash
   cd edge-pipeline && python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt && python -m consumer.main
   ```

3. In another terminal, **produce** sample events:

   ```bash
   pip install -r scripts/requirements.txt
   python scripts/produce_sample_events.py
   ```

   The consumer will upsert patients/encounters/observations/medication_requests into Postgres and invalidate Redis caches.

4. Start the **gateway** and query:

   ```bash
   cd ehr-api && source .venv/bin/activate && uvicorn app.main:app --port 8000
   curl -H "X-Facility-Id: FAC-A" http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5
   curl -H "X-Facility-Id: FAC-A" http://localhost:8000/fhir/r5/Patient/P001/observations?limit=20
   curl -H "X-Facility-Id: FAC-A" http://localhost:8000/fhir/r5/Patient/P001/medication-requests?limit=20
   ```

   First request hits Postgres (cache miss); subsequent requests are served from Redis (&lt;50 ms).

## Repo layout

| Path | Description |
| ------ | ------------- |
| [docs/](docs/) | Blueprint, Phase 1 plan |
| [infra/](infra/) | Docker Compose (Kafka, Redis, PostgreSQL) |
| [ehr-api/](ehr-api/) | Edge FHIR gateway (FastAPI; Redis → Postgres) |
| [edge-pipeline/](edge-pipeline/) | Kafka consumer → Redis + Postgres |
| [load-tests/](load-tests/) | k6 latency test |
| [scripts/](scripts/) | Seed data, Kafka producer for sample events |

## Phase 1 success criteria

- P95 latency for `GET /fhir/r5/Patient/{id}/summary` **&lt;50 ms**
- No duplicate data entry for shared patients (event-driven sync via Kafka)
- 99.9% uptime during pilot

See [docs/phase1-plan.md](docs/phase1-plan.md) for full scope and timeline.

## CI/CD (GitHub Actions)

This repo includes two workflows:

- `CI` (`.github/workflows/ci.yml`)
  - Triggers on push to `main` and pull requests.
  - Runs Python lint checks (`ruff`) and unit tests (`pytest`).

- `k6 Scheduled Smoke` (`.github/workflows/k6-scheduled.yml`)
  - Runs nightly and can also be triggered manually.
  - Runs `load-tests/gateway-latency.js` only when `K6_BASE_URL` is configured.

### Optional: enable scheduled k6

When you are ready, configure this repository secret in GitHub:

- `K6_BASE_URL` = URL of your deployed gateway environment (for example, staging).

If the secret is not set, the scheduled workflow exits successfully and skips k6.

### k6 target readiness checklist

Before relying on scheduled k6 results, verify the target environment:

- **Gateway is reachable:** `GET {K6_BASE_URL}/health` returns `200`.
- **Test data is present:** patient `P001` exists with at least one encounter.
- **Header compatibility:** summary endpoint accepts `X-Facility-Id: FAC-A`.
- **Consent behavior is understood:** if strict mode is enabled, ensure test consent exists or run with `scope=emergency`.
- **Latency interpretation:** compare k6 `P95` with the Phase 1 target (`<50 ms`) and investigate regressions early.
