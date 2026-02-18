# UniHealth EHR

Next-generation national Electronic Health Record system (see [Blueprint](docs/UniHealth-EHR-Blueprint.md)). This repo contains **Phase 1: MVP** — edge FHIR gateway, event pipeline, and load tests targeting **P95 &lt;50 ms** for patient + recent encounter lookup.

## Phase 1 quick start

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

## Repo layout

| Path | Description |
|------|-------------|
| [docs/](docs/) | Blueprint, Phase 1 plan |
| [infra/](infra/) | Docker Compose (Kafka, Redis, PostgreSQL) |
| [ehr-api/](ehr-api/) | Edge FHIR gateway (FastAPI; Redis → Postgres) |
| [edge-pipeline/](edge-pipeline/) | Kafka consumer → Redis + Postgres |
| [load-tests/](load-tests/) | k6 latency test |
| [scripts/](scripts/) | Seed data |

## Phase 1 success criteria

- P95 latency for `GET /fhir/r5/Patient/{id}/summary` **&lt;50 ms**
- No duplicate data entry for shared patients (event-driven sync via Kafka)
- 99.9% uptime during pilot

See [docs/phase1-plan.md](docs/phase1-plan.md) for full scope and timeline.
