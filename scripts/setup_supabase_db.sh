#!/usr/bin/env bash
# Apply UniHealth schema + seed to a live Postgres (Supabase) and verify.
#
# Usage:
#   export EHR_POSTGRES_DSN='postgresql://postgres.<ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres'
#   # Prefer Session mode (port 5432) or Direct connection for DDL — not Transaction pooler (6543).
#   ./scripts/setup_supabase_db.sh
#
# Optional:
#   SKIP_SEED=1 ./scripts/setup_supabase_db.sh   # schema + verify only
#   VERIFY_ONLY=1 ./scripts/setup_supabase_db.sh # verify existing DB
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$ROOT/ehr-api/schema.sql"
SEED="$ROOT/scripts/seed_data.py"
VERIFY="$ROOT/scripts/verify_postgres_pilot.py"

if [[ -z "${EHR_POSTGRES_DSN:-}" ]]; then
  echo "ERROR: Set EHR_POSTGRES_DSN to your Supabase Postgres URI."
  echo
  echo "Supabase → Project Settings → Database → Connection string → URI"
  echo "  • Use Direct connection or Session pooler (port 5432)"
  echo "  • Append ?sslmode=require if not already present"
  echo
  echo "Example:"
  echo "  export EHR_POSTGRES_DSN='postgresql://postgres.xxxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require'"
  exit 1
fi

# Ensure SSL for Supabase / managed Postgres
DSN="$EHR_POSTGRES_DSN"
if [[ "$DSN" != *"sslmode="* ]]; then
  if [[ "$DSN" == *"?"* ]]; then
    DSN="${DSN}&sslmode=require"
  else
    DSN="${DSN}?sslmode=require"
  fi
fi
export EHR_POSTGRES_DSN="$DSN"

echo "==> Target: ${EHR_POSTGRES_DSN%%:*}://***@***"

# Prefer psql when available; fall back to Python asyncpg apply
apply_schema() {
  if command -v psql >/dev/null 2>&1; then
    echo "==> Applying schema via psql"
    psql "$EHR_POSTGRES_DSN" -v ON_ERROR_STOP=1 -f "$SCHEMA"
  else
    echo "==> Applying schema via Python (psql not found)"
    python3 - <<'PY'
import asyncio, os, pathlib, re
import asyncpg

async def main():
    dsn = os.environ["EHR_POSTGRES_DSN"]
    sql = pathlib.Path(os.environ["SCHEMA_PATH"]).read_text()
    # Strip line comments; split on semicolons at end of statements
    lines = []
    for line in sql.splitlines():
        if line.strip().startswith("--"):
            continue
        lines.append(line)
    body = "\n".join(lines)
    statements = [s.strip() for s in body.split(";") if s.strip()]
    kwargs = {}
    if "supabase.com" in dsn or "sslmode=require" in dsn:
        kwargs["ssl"] = "require"
    conn = await asyncpg.connect(dsn, **kwargs)
    try:
        for stmt in statements:
            await conn.execute(stmt)
    finally:
        await conn.close()
    print(f"Schema applied ({len(statements)} statements).")

asyncio.run(main())
PY
  fi
}

export SCHEMA_PATH="$SCHEMA"

if [[ "${VERIFY_ONLY:-0}" != "1" ]]; then
  apply_schema
  if [[ "${SKIP_SEED:-0}" != "1" ]]; then
    echo "==> Seeding pilot patients / encounters"
    python3 "$SEED"
  else
    echo "==> Skipping seed (SKIP_SEED=1)"
  fi
fi

echo "==> Verifying tables + FK pilot data"
python3 "$VERIFY"

echo
echo "SUCCESS — Supabase Postgres is ready for ehr-api."
echo "Start the API with:"
echo "  export EHR_POSTGRES_DSN='…same URI…'"
echo "  export EHR_INFRA_OPTIONAL=false"
echo "  cd ehr-api && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8100"
