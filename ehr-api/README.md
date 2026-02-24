# EHR API – Edge FHIR Gateway (Phase 1)

Phase 1 implementation of the UniHealth EHR edge gateway. Serves **patient + recent encounters** with a **P95 &lt;50 ms** target by reading from Redis first, then PostgreSQL.

## Endpoints

- **GET** `/fhir/r5/Patient/{patient_id}/summary?encounters=5`  
  Returns patient demographics and last N encounters (FHIR-style JSON).  
  Cache-first; on miss loads from DB and backfills cache.

- **POST** `/fhir/r5/Patient` – Ingest patient (pilot EMR). Body: FHIR-style Patient JSON (`id` required). Publishes to Kafka → consumer updates Postgres/Redis.

- **POST** `/fhir/r5/Encounter` – Ingest encounter (pilot EMR). Body: FHIR-style Encounter JSON (`id`, `patient_id` or `subject.reference` required). Publishes to Kafka.

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

## Environment

| Variable | Default | Description |
|----------|--------|-------------|
| EHR_REDIS_URL | redis://localhost:6379/0 | Redis connection |
| EHR_POSTGRES_DSN | postgresql://ehr:...@localhost:5432/ehr | PostgreSQL connection |
| EHR_CACHE_TTL_SECONDS | 300 | Cache TTL for patient summary |

## Later (Phase 2+)

This service is intended to be replaced or wrapped by **HAPI FHIR R5** for full FHIR compliance; the latency pattern (Redis → Postgres) remains the same.
