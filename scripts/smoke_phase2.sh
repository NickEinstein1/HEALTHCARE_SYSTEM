#!/usr/bin/env bash
# Phase 2 smoke: production profile flags + FHIR Consent (uses header auth if OIDC token not set).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${EHR_GATEWAY_URL:-http://localhost:8100}"
FACILITY="${SMOKE_FACILITY_ID:-FAC-A}"
PATIENT="${SMOKE_PATIENT_ID:-P001}"

echo "== Phase 2 smoke @ ${BASE} =="

auth_json="$(curl -sf "${BASE}/auth/status")"
echo "auth/status: ${auth_json}"

if command -v jq >/dev/null 2>&1; then
  env_name="$(echo "${auth_json}" | jq -r '.deployment_env // "unknown"')"
  consent="$(echo "${auth_json}" | jq -r '.consent_mode // "unknown"')"
  echo "  deployment_env=${env_name} consent_mode=${consent}"
fi

echo "== Grant consent (legacy) =="
curl -sf -X POST "${BASE}/consent/grant" \
  -H "Content-Type: application/json" \
  -H "X-UniHealth-Role: nurse" \
  -d "{\"patient_id\":\"${PATIENT}\",\"facility_id\":\"${FACILITY}\",\"scope\":\"treatment\"}" \
  | head -c 200
echo

echo "== FHIR Consent search =="
curl -sf "${BASE}/fhir/r5/Consent?patient=${PATIENT}" \
  -H "X-UniHealth-Role: doctor" \
  -H "X-Facility-Id: ${FACILITY}" | head -c 400
echo

echo "== Patient summary (strict consent needs grant above) =="
curl -sf "${BASE}/fhir/r5/Patient/${PATIENT}/summary?encounters=2" \
  -H "X-UniHealth-Role: doctor" \
  -H "X-Facility-Id: ${FACILITY}" | head -c 300
echo

echo "Phase 2 smoke OK"
