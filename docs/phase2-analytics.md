# Phase 2 — national analytics (aggregates only)

The national layer must **not** receive raw patient identifiers. Facilities emit **pre-aggregated** metrics to Kafka topic **`ehr.analytics.aggregate`**.

## Event shape

```json
{
  "facility_id": "FAC-A",
  "metric": "ward_occupancy_pct",
  "period": "2026-05-18T12:00:00Z",
  "value": 87.5,
  "dimensions": { "ward_id": "WARD-4B" },
  "emitted_at": "2026-05-18T12:05:00Z"
}
```

**Forbidden in payloads:** `patient_id`, names, national IDs, free-text clinical notes.

## Producer (gateway)

From Python (sync helper):

```python
from app.analytics import emit_aggregate_sync

emit_aggregate_sync(
    facility_id="FAC-A",
    metric="encounters_ingested_count",
    period="2026-05-18",
    value=42,
    dimensions={"source": "kafka"},
)
```

Wire into ingestion hooks when hospital onboarding defines which metrics each site publishes.

## Consumer (scaffold)

```bash
cd analytics-pipeline
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
KAFKA_BOOTSTRAP_SERVERS=localhost:9092 python -m consumer.main
```

Future: sink to Iceberg / warehouse tables for national dashboards.

## Topic

Created by `kafka-init` in staging/production compose overlays (`ehr.analytics.aggregate`).
