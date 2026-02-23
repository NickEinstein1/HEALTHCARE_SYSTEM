#!/usr/bin/env bash
# UniHealth EHR Phase 1 - Run full flow locally.
# Prereqs: Docker (for Kafka, Redis, Postgres), Python 3.10+, psql (for schema).
# Usage: ./scripts/run_full_flow.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1. Starting infrastructure (Docker) ==="
cd infra && docker compose up -d && cd ..
echo "Waiting for Postgres to be ready..."
sleep 5

echo "=== 2. Applying DB schema ==="
psql -U ehr -d ehr -h localhost -f ehr-api/schema.sql 2>/dev/null || \
  PGPASSWORD=ehr_dev_password psql -U ehr -d ehr -h localhost -f ehr-api/schema.sql

echo "=== 3. Virtual environments (create + install if missing) ==="
for dir in ehr-api edge-pipeline; do
  if [ ! -d "$dir/.venv" ]; then
    python3 -m venv "$dir/.venv"
    "$dir/.venv/bin/pip" install -q -r "$dir/requirements.txt"
  fi
done
# Producer script uses edge-pipeline venv (has kafka-python)
edge-pipeline/.venv/bin/pip install -q -r scripts/requirements.txt 2>/dev/null || true

echo "=== 4. Starting consumer (processes Kafka → Postgres/Redis) ==="
(cd edge-pipeline && ../edge-pipeline/.venv/bin/python -m consumer.main) &
CONSUMER_PID=$!
sleep 2

echo "=== 5. Producing sample events to Kafka ==="
edge-pipeline/.venv/bin/python scripts/produce_sample_events.py
sleep 2

echo "=== 6. Starting EHR gateway on http://localhost:8000 ==="
(cd ehr-api && ../ehr-api/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000) &
GATEWAY_PID=$!
sleep 2

echo "=== 7. Test request ==="
curl -s http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5 | head -c 500
echo ""

echo ""
echo "Full flow is running. Gateway: http://localhost:8000 (PID $GATEWAY_PID), Consumer: PID $CONSUMER_PID"
echo "To stop: kill $GATEWAY_PID $CONSUMER_PID"
echo "Load test: k6 run load-tests/gateway-latency.js"
