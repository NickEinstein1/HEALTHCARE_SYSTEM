#!/usr/bin/env bash
# Phase 1 E2E: HTTP ingest → Kafka → consumer → gateway read (requires running stack).
# Prereqs: docker infra, consumer, gateway (e.g. ./scripts/run_full_flow.sh).
# Usage:
#   ./scripts/verify_phase1_e2e.sh
#   EHR_GATEWAY_URL=http://localhost:8100 ./scripts/verify_phase1_e2e.sh

set -euo pipefail

BASE="${EHR_GATEWAY_URL:-http://localhost:8000}"
BASE="${BASE%/}"
SUFFIX="$(date +%s)"
PID="P-E2E-${SUFFIX}"
EID="E-E2E-${SUFFIX}"
OID="O-E2E-${SUFFIX}"
MID="M-E2E-${SUFFIX}"
AID="A-E2E-${SUFFIX}"
FACILITY="${SMOKE_FACILITY_ID:-FAC-A}"

post_accept() {
  local name="$1"
  shift
  local code
  code="$(curl -s -o /tmp/unihealth-p1-e2e.json -w "%{http_code}" -X POST "$@")"
  echo "$name -> HTTP $code"
  [ "$code" = "202" ] || { head -c 400 /tmp/unihealth-p1-e2e.json; echo; exit 1; }
}

poll_json_contains() {
  local name="$1"
  local url="$2"
  local needle="$3"
  local i
  for i in $(seq 1 30); do
    if curl -sf -H "X-Facility-Id: $FACILITY" "$url" | grep -q "$needle"; then
      echo "$name -> found $needle (try $i)"
      return 0
    fi
    sleep 1
  done
  echo "$name -> TIMEOUT waiting for $needle"
  exit 1
}

post_accept "POST Patient" "$BASE/fhir/r5/Patient" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"${PID}\",\"nhi_number\":\"NHI-${PID}\",\"family_name\":\"E2E\",\"given_name\":\"Test\"}"

post_accept "POST Encounter" "$BASE/fhir/r5/Encounter" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"${EID}\",\"patient_id\":\"${PID}\",\"facility_id\":\"${FACILITY}\",\"status\":\"finished\"}"

post_accept "POST Observation" "$BASE/fhir/r5/Observation" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"${OID}\",\"patient_id\":\"${PID}\",\"code\":\"8867-4\",\"valueQuantity\":{\"value\":80,\"unit\":\"/min\"}}"

post_accept "POST MedicationRequest" "$BASE/fhir/r5/MedicationRequest" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"${MID}\",\"patient_id\":\"${PID}\",\"status\":\"active\",\"medication_code\":\"RX-E2E\"}"

post_accept "POST AllergyIntolerance" "$BASE/fhir/r5/AllergyIntolerance" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"${AID}\",\"patient_id\":\"${PID}\",\"code\":\"penicillin\",\"substance_text\":\"Penicillin\",\"criticality\":\"high\"}"

poll_json_contains "summary has encounter" \
  "$BASE/fhir/r5/Patient/${PID}/summary?encounters=5&scope=treatment" \
  "$EID"

poll_json_contains "observations has row" \
  "$BASE/fhir/r5/Patient/${PID}/observations?limit=10&scope=treatment" \
  "$OID"

poll_json_contains "medication-requests has row" \
  "$BASE/fhir/r5/Patient/${PID}/medication-requests?limit=10&scope=treatment" \
  "$MID"

poll_json_contains "allergy-intolerances has row" \
  "$BASE/fhir/r5/Patient/${PID}/allergy-intolerances?limit=10&scope=treatment" \
  "$AID"

echo "Phase 1 E2E OK (patient=${PID})."
