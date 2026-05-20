#!/usr/bin/env bash
# Stop staging stack (keeps volumes unless --purge).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT/infra/docker-compose.staging.yml"
ENV_FILE="$ROOT/infra/.env.staging"

PURGE=0
[ "${1:-}" = "--purge" ] && PURGE=1

if [ "$PURGE" -eq 1 ]; then
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v
  echo "Staging stack stopped; volumes removed."
else
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
  echo "Staging stack stopped (data volumes kept). Use --purge to wipe DB."
fi
