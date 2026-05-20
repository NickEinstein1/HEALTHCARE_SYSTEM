#!/usr/bin/env bash
# Configure frontend/app for staging gateway (8100) + Keycloak OIDC.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/frontend/app"
EXAMPLE="$APP/.env.staging.example"
TARGET="$APP/.env"

if [ ! -f "$EXAMPLE" ]; then
  echo "Missing $EXAMPLE"
  exit 1
fi

cp "$EXAMPLE" "$TARGET"
echo "Wrote $TARGET (staging: gateway :8100, Keycloak :8180, OIDC on)"

if [ ! -d "$APP/node_modules" ]; then
  echo "Installing npm dependencies..."
  (cd "$APP" && npm install)
fi

echo ""
echo "Start UI:  cd frontend/app && npm run dev"
echo "Open:      http://localhost:5173"
