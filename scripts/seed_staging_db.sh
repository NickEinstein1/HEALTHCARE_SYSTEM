#!/usr/bin/env bash
# Apply ehr-api/schema.sql + seed demo data (no host volume mounts — works on Docker Desktop Mac).
# Prereqs: ./scripts/run_staging.sh (or staging postgres container healthy)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT/infra/docker-compose.staging.yml"
ENV_FILE="$ROOT/infra/.env.staging"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — run: cp infra/.env.staging.example infra/.env.staging"
  exit 1
fi

DC=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

if ! "${DC[@]}" ps -q postgres 2>/dev/null | grep -q .; then
  echo "Staging postgres is not running. Start stack first:"
  echo "  ./scripts/run_staging.sh"
  exit 1
fi

_psql() {
  "${DC[@]}" exec -T postgres psql -U ehr -d ehr "$@"
}

echo "=== Applying schema (ehr-api/schema.sql) ==="
_psql < "$ROOT/ehr-api/schema.sql"

echo "=== Seeding patients, encounters, P001 vitals/meds ==="
_psql < "$ROOT/scripts/seed_staging_data.sql"

echo "=== Seeding pilot staff accounts (6 roles) ==="
_psql < "$ROOT/scripts/seed_pilot_staff.sql"

echo "=== Clearing Redis cache keys for P001 (optional) ==="
if "${DC[@]}" ps -q redis 2>/dev/null | grep -q .; then
  "${DC[@]}" exec -T redis redis-cli DEL \
    "patient:P001:observations" \
    "patient:P001:med_requests" \
    "patient:P001:summary" 2>/dev/null || true
fi

echo "Done: 3 patients, 6 encounters, P001 observations + medications."
echo "Restart gateway if FHIR reads still look stale:"
echo "  docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart gateway"
