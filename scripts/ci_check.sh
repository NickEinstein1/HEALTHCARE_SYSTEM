#!/usr/bin/env bash
# Mirror .github/workflows/ci.yml locally before push (no Postgres/Redis required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Ruff (critical rules)"
python3 -m pip install -q pytest ruff 2>/dev/null || true
python3 -m ruff check . --select E9,F63,F7,F82

echo "==> Markdown lint"
npx --yes markdownlint-cli2 "README.md" "docs/**/*.md"

echo "==> Python deps (ehr-api)"
python3 -m pip install -q -r ehr-api/requirements.txt -r edge-pipeline/requirements.txt -r scripts/requirements.txt

echo "==> Root tests"
pytest -q tests

echo "==> EHR API tests (no Postgres/Redis)"
cd ehr-api && PYTHONPATH=. pytest tests/ -q

echo "==> Frontend lint + build"
cd "$ROOT/frontend/app" && npm ci && npm run lint && npm run build

echo "CI checks passed."
