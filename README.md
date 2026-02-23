# UniHealth EHR

Next-generation national Electronic Health Record system (see [Blueprint](docs/UniHealth-EHR-Blueprint.md)). This repo contains **Phase 1: MVP** — edge FHIR gateway, event pipeline, and load tests targeting **P95 &lt;50 ms** for patient + recent encounter lookup.

## Phase 1 quick start

**One-shot full flow (after Docker is running):**

```bash
./scripts/run_full_flow.sh
```

Then open http://localhost:8000/docs or run `curl http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5`.

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
curl http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5
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

   The consumer will upsert patients/encounters into Postgres and invalidate Redis cache.

4. Start the **gateway** and query:

   ```bash
   cd ehr-api && source .venv/bin/activate && uvicorn app.main:app --port 8000
   curl http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5
   ```

   First request hits Postgres (cache miss); subsequent requests are served from Redis (&lt;50 ms).

## Repo layout

| Path | Description |
|------|-------------|
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
