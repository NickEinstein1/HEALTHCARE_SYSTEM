#!/usr/bin/env bash
# Smoke test for infra/docker-compose.staging.yml (expects stack already up).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GATEWAY="${EHR_GATEWAY_URL:-http://localhost:8100}"
GATEWAY="${GATEWAY%/}"
KEYCLOAK="${KEYCLOAK_URL:-http://localhost:8180}"
REALM="${KEYCLOAK_REALM:-unihealth}"
CLIENT="${KEYCLOAK_CLIENT_ID:-unihealth-spa}"

echo "=== Staging smoke: health ==="
curl -sf "$GATEWAY/health" | grep -q '"status"' && echo "gateway OK"

echo "=== Staging smoke: auth status ==="
curl -sf "$GATEWAY/auth/status" | grep -q 'oidc_enabled' && echo "auth/status OK"

echo "=== Staging smoke: OIDC token (doctor) ==="
TOKEN=""
if command -v jq >/dev/null 2>&1; then
  TOKEN="$(curl -s -X POST "$KEYCLOAK/realms/$REALM/protocol/openid-connect/token" \
    -d "grant_type=password" \
    -d "client_id=$CLIENT" \
    -d "username=doctor" \
    -d "password=Changeme1!" | jq -r '.access_token // empty' 2>/dev/null || true)"
fi
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  curl -sf -H "Authorization: Bearer $TOKEN" "$GATEWAY/auth/me" | grep -q '"role":"doctor"' && echo "OIDC /auth/me OK"
  curl -sf -H "Authorization: Bearer $TOKEN" "$GATEWAY/ai/status" | grep -q 'phase' && echo "OIDC AI status OK"
else
  echo "WARN: Keycloak token fetch failed — continuing with header fallback (check realm import / pilot users)"
fi

echo "=== Staging smoke: seed sample data (if empty) ==="
if ! curl -sf -H "X-Facility-Id: FAC-A" "$GATEWAY/fhir/r5/Patient/P001/summary?encounters=1" >/dev/null 2>&1; then
  PY=""
  if [ -x "$ROOT/edge-pipeline/.venv/bin/python" ]; then
    PY="$ROOT/edge-pipeline/.venv/bin/python"
  elif [ -x "$ROOT/ehr-api/.venv/bin/python" ]; then
    PY="$ROOT/ehr-api/.venv/bin/python"
  else
    PY="python3"
  fi
  KAFKA_BOOTSTRAP_SERVERS="${KAFKA_BOOTSTRAP_SERVERS:-localhost:9092}" \
    "$PY" "$ROOT/scripts/produce_sample_events.py"
  echo "Waiting for consumer ingest..."
  for _ in $(seq 1 30); do
    if curl -sf -H "X-Facility-Id: FAC-A" "$GATEWAY/fhir/r5/Patient/P001/summary?encounters=1" >/dev/null 2>&1; then
      echo "Sample data ready (P001)"
      break
    fi
    sleep 1
  done
else
  echo "P001 already present — skip producer"
fi

echo "=== Staging smoke: Phase 1 header path ==="
EHR_GATEWAY_URL="$GATEWAY" "$ROOT/scripts/smoke_phase1.sh"

echo "=== Staging smoke: Phase 1 E2E (ingest → read) ==="
EHR_GATEWAY_URL="$GATEWAY" "$ROOT/scripts/verify_phase1_e2e.sh"

echo "Staging smoke OK."
