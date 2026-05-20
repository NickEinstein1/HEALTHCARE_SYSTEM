#!/usr/bin/env bash
# UniHealth EHR Phase 1 - Run full flow locally.
# Prereqs: Docker (for Kafka, Redis, Postgres), Python 3.10+, psql (for schema).
# Usage: ./scripts/run_full_flow.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1. Starting infrastructure (Docker) ==="
cd infra && docker compose up -d && cd ..

echo "Waiting for Kafka and Postgres to be ready..."
for _ in $(seq 1 60); do
  if docker compose -f infra/docker-compose.yml exec -T postgres pg_isready -U ehr -d ehr >/dev/null 2>&1 \
    && docker compose -f infra/docker-compose.yml exec -T kafka kafka-topics --bootstrap-server localhost:9092 --list >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "=== 2. Applying DB schema ==="
# Apply schema using psql inside the postgres container (no host psql required)
docker compose -f infra/docker-compose.yml exec -T postgres \
  psql -U ehr -d ehr < "$ROOT/ehr-api/schema.sql"

echo "=== 3. Virtual environments (create + install if missing) ==="
for dir in ehr-api edge-pipeline; do
  if [ ! -d "$dir/.venv" ]; then
    python3 -m venv "$dir/.venv"
    "$dir/.venv/bin/pip" install -q -r "$dir/requirements.txt"
  fi
done
# Producer script dependencies (uses confluent-kafka)
edge-pipeline/.venv/bin/pip install -q -r "$ROOT/scripts/requirements.txt"

echo "=== 4. Starting consumer (processes Kafka → Postgres/Redis) ==="
CONSUMER_LOG="$ROOT/.consumer.log"
rm -f "$CONSUMER_LOG"
(cd edge-pipeline && ./.venv/bin/python -m consumer.main) >"$CONSUMER_LOG" 2>&1 &
CONSUMER_PID=$!
sleep 2

echo "=== 5. Producing sample events to Kafka ==="
set +e
./edge-pipeline/.venv/bin/python "$ROOT/scripts/produce_sample_events.py"
PRODUCE_EXIT=$?
set -e
if [ "$PRODUCE_EXIT" != "0" ]; then
  echo "Producer failed (exit=$PRODUCE_EXIT). Last consumer log lines:"
  tail -n 50 "$CONSUMER_LOG" 2>/dev/null || true
  echo "Kafka logs:"
  docker compose -f infra/docker-compose.yml logs kafka --tail 100 || true
  exit "$PRODUCE_EXIT"
fi
sleep 2

echo "=== 5b. Verifying Postgres received data ==="
PATIENTS_COUNT="0"
echo "Waiting up to 30s for consumer ingest..."
for _ in $(seq 1 30); do
  PATIENTS_COUNT="$(docker compose -f infra/docker-compose.yml exec -T postgres \
    psql -U ehr -d ehr -t -c "select count(*) from patients;" | tr -d '[:space:]' || true)"
  if [ -n "$PATIENTS_COUNT" ] && [ "$PATIENTS_COUNT" != "0" ]; then
    break
  fi
  sleep 1
done
echo "patients.count=$PATIENTS_COUNT"
if [ -z "$PATIENTS_COUNT" ] || [ "$PATIENTS_COUNT" = "0" ]; then
  echo "ERROR: No patients in DB after producing events. Consumer likely failed or is blocked."
  echo "Last consumer log lines ($CONSUMER_LOG):"
  tail -n 120 "$CONSUMER_LOG" 2>/dev/null || true
  echo "Kafka logs:"
  docker compose -f infra/docker-compose.yml logs kafka --tail 200 || true
  echo "Postgres logs:"
  docker compose -f infra/docker-compose.yml logs postgres --tail 120 || true
  exit 1
fi

PORT="${EHR_PORT:-8100}"
echo "=== 6. Starting EHR gateway on http://localhost:${PORT} ==="
(cd ehr-api && ./.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port "$PORT") &
GATEWAY_PID=$!
sleep 2

echo "=== 7. Test request ==="
curl -s "http://localhost:${PORT}/health" || true

echo "Waiting for patient P001 to be queryable..."
for _ in $(seq 1 30); do
  code="$(curl -s -o /dev/null -w "%{http_code}" -H "X-Facility-Id: FAC-A" "http://localhost:${PORT}/fhir/r5/Patient/P001/summary?encounters=5" || true)"
  if [ "$code" = "200" ]; then
    break
  fi
  sleep 1
done

curl -s -H "X-Facility-Id: FAC-A" "http://localhost:${PORT}/fhir/r5/Patient/P001/summary?encounters=5" | head -c 500
echo ""

echo "=== 7b. Phase 3 AI Assist (simulator, no extra services) ==="
curl -s -o /dev/null -w "GET /ai/status HTTP %{http_code}\n" "http://localhost:${PORT}/ai/status" || true
curl -s -o /dev/null -w "GET /ai/wards (doctor) HTTP %{http_code}\n" -H "X-UniHealth-Role: doctor" "http://localhost:${PORT}/ai/wards" || true

echo "Granting consent (Phase 1) ..."
curl -s -X POST "http://localhost:${PORT}/consent/grant" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"P001","facility_id":"FAC-A","scope":"treatment"}' | head -c 400
echo ""

echo "=== 8. Phase 1 smoke (read path + consent) ==="
EHR_GATEWAY_URL="http://localhost:${PORT}" "$ROOT/scripts/smoke_phase1.sh"

if [ "${RUN_K6:-}" = "1" ] && command -v k6 >/dev/null 2>&1; then
  echo "=== 9. k6 latency (P95 <50 ms) ==="
  BASE_URL="http://localhost:${PORT}" VUS="${K6_VUS:-100}" DURATION="${K6_DURATION:-30s}" \
    k6 run "$ROOT/load-tests/gateway-latency.js"
elif [ "${RUN_K6:-}" = "1" ]; then
  echo "RUN_K6=1 but k6 not installed — skip (https://k6.io)"
fi

echo ""
echo "Full flow is running. Gateway: http://localhost:${PORT} (PID $GATEWAY_PID), Consumer: PID $CONSUMER_PID"
echo "To stop: kill $GATEWAY_PID $CONSUMER_PID"
echo "Phase 1 E2E ingest: EHR_GATEWAY_URL=http://localhost:${PORT} ./scripts/verify_phase1_e2e.sh"
echo "Load test: RUN_K6=1 ./scripts/run_full_flow.sh   # or: BASE_URL=http://localhost:${PORT} k6 run load-tests/gateway-latency.js"
