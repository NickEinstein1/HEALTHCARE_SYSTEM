#!/usr/bin/env bash
# Bring up the full Phase 1 staging stack (Docker) and verify it.
# Usage: ./scripts/run_staging.sh [--smoke-only] [--no-smoke]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT/infra/docker-compose.staging.yml"
ENV_FILE="$ROOT/infra/.env.staging"
ENV_EXAMPLE="$ROOT/infra/.env.staging.example"
GATEWAY="${EHR_GATEWAY_URL:-http://localhost:8100}"
GATEWAY="${GATEWAY%/}"

SMOKE=1
for arg in "$@"; do
  case "$arg" in
    --smoke-only) SMOKE_ONLY=1 ;;
    --no-smoke) SMOKE=0 ;;
    -h|--help)
      echo "Usage: $0 [--smoke-only] [--no-smoke]"
      echo "  --smoke-only  Skip docker compose up; run smoke tests only"
      echo "  --no-smoke    Start stack but skip smoke scripts"
      exit 0
      ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "Creating $ENV_FILE from example..."
  cp "$ENV_EXAMPLE" "$ENV_FILE"
fi

if [ "${SMOKE_ONLY:-0}" != "1" ]; then
  echo "=== Staging: starting Docker stack ==="
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --build

  echo "=== Staging: waiting for gateway ==="
  for i in $(seq 1 90); do
    if curl -sf "$GATEWAY/health" >/dev/null 2>&1; then
      echo "Gateway ready at $GATEWAY (${i}s)"
      break
    fi
    if [ "$i" -eq 90 ]; then
      echo "ERROR: gateway not healthy at $GATEWAY after 90s"
      docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
      exit 1
    fi
    sleep 1
  done
fi

if [ "$SMOKE" -eq 1 ]; then
  echo "=== Staging: smoke tests ==="
  EHR_GATEWAY_URL="$GATEWAY" "$ROOT/scripts/smoke_staging.sh"
fi

LAN_IP=""
if command -v ipconfig >/dev/null 2>&1; then
  LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
elif command -v hostname >/dev/null 2>&1; then
  LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
fi

cat <<EOF

╔══════════════════════════════════════════════════════════════════╗
║  UniHealth staging stack is up                                   ║
╠══════════════════════════════════════════════════════════════════╣
║  Gateway   $GATEWAY
║  Keycloak  http://localhost:8180
║  Kafka     localhost:9092
╠══════════════════════════════════════════════════════════════════╣
║  Next: frontend (new terminal)                                     ║
║    ./scripts/setup_frontend_staging.sh
║    cd frontend/app && npm run dev
║    → http://localhost:5173
║                                                                    ║
║  Sign in (staff): doctor / nurse / admin  password Changeme1!      ║
╠══════════════════════════════════════════════════════════════════╣
║  Other devices on your Wi‑Fi: see docs/runbook-staging.md          ║
EOF
if [ -n "$LAN_IP" ]; then
  echo "║  This laptop LAN IP: $LAN_IP"
  echo "║  (use infra/docker-compose.staging.lan.yml for OIDC on LAN)"
fi
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Stop stack: ./scripts/stop_staging.sh"
