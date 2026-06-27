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
# Dev uses Vite proxy — do not set VITE_API_BASE_URL (avoids cross-origin fetch to :8100).
sed -i.bak '/^VITE_API_BASE_URL=/d' "$TARGET" 2>/dev/null || sed -i '' '/^VITE_API_BASE_URL=/d' "$TARGET"
rm -f "$TARGET.bak"
echo "Wrote $TARGET (Vite proxy → gateway :8100, Keycloak :8180)"

if [ ! -d "$APP/node_modules" ]; then
  echo "Installing npm dependencies..."
  (cd "$APP" && npm install)
fi

echo ""
echo "Start UI:  cd frontend/app && npm run dev"
echo "Open:      http://localhost:5173"
