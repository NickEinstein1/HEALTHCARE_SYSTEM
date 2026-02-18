# Edge Pipeline (Phase 1)

Consumes FHIR-style events from Kafka and updates Redis (hot cache) and PostgreSQL (warm store) so the EHR gateway can serve &lt;50 ms reads.

## Topics (Phase 1)

- `ehr.patient` – Patient create/update
- `ehr.encounter` – Encounter create/update

## Run

1. Infra and EHR API running; topics created (auto-create enabled in dev).
2. From this directory:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   python -m consumer.main
   ```

## Config

| Env | Default |
|-----|--------|
| KAFKA_BOOTSTRAP_SERVERS | localhost:9092 |
| EHR_REDIS_URL | redis://localhost:6379/0 |
| EHR_POSTGRES_DSN | postgresql://ehr:...@localhost:5432/ehr |

## Flow

- Consume from `ehr.patient` / `ehr.encounter`.
- Upsert into PostgreSQL.
- Invalidate or update Redis cache key `patient:{id}:summary` so next gateway read gets fresh data (or refill via DB on next request).
