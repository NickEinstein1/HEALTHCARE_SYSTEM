# Infrastructure (Phase 1)

Dev-only stack for UniHealth EHR Phase 1.

## Prerequisites

- Docker and Docker Compose

## Start

```bash
docker compose up -d
```

## Services

| Service   | Port  | Purpose                          |
|-----------|-------|----------------------------------|
| Kafka     | 9092  | Event streaming (Patient, Encounter, etc.) |
| Redis     | 6379  | Hot cache for &lt;50 ms reads    |
| PostgreSQL| 5432  | Warm store (patients, encounters)|

## Stop

```bash
docker compose down
# With volume: docker compose down -v
```

## Apply DB schema

After Postgres is up, run migrations or seed from project root:

```bash
# From repo root, after ehr-api venv is active:
python scripts/seed_data.py
```

Or apply SQL in `ehr-api/schema.sql` if present.
