# Live database on Supabase

Facility-pilot Postgres can run on [Supabase](https://supabase.com) instead of local Docker.

## Steps

1. Create a Supabase project (any region close to your API host).
2. Open **Project Settings → Database**.
3. Copy the **URI** connection string.
   - Prefer **Session pooler** on port **5432** (IPv4). Host often looks like
     `aws-1-<region>.pooler.supabase.com` with user `postgres.<project-ref>`.
   - **Direct** `db.<ref>.supabase.co` may be **IPv6-only** on free tier — laptops
     without IPv6 routing will fail DNS/connect. Use the Session pooler instead.
   - Do **not** use the Transaction pooler (`:6543`) for `schema.sql` — DDL can fail.
4. Reset/set the database password if you have not saved it.
5. From the repo root:

```bash
export EHR_POSTGRES_DSN='postgresql://postgres.<ref>:<PASSWORD>@aws-1-<region>.pooler.supabase.com:5432/postgres?sslmode=require'
chmod +x scripts/setup_supabase_db.sh
./scripts/setup_supabase_db.sh
```

This will:

- Apply `ehr-api/schema.sql` (patients, clinical, billing, UHIC, …)
- Run `scripts/seed_data.py` (P001–P003 + encounters)
- Run `scripts/verify_postgres_pilot.py` (tables, seed, indexes)

1. Point the API at Supabase and start (Redis can remain local for pilot):

```bash
export EHR_POSTGRES_DSN='…same URI…'
export EHR_INFRA_OPTIONAL=false
export EHR_OTP_SIMULATE=true          # local pilot only
export EHR_MPESA_SIMULATE=true        # local pilot only
cd ehr-api
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8100
```

1. Smoke:

```bash
EHR_GATEWAY_URL=http://127.0.0.1:8100 ./scripts/smoke_go_live.sh
```

On first API start with empty billing/UHIC tables, `load_pilot_state()` seeds invoices/members into Supabase automatically.

## Notes

- Always include `sslmode=require` (or let `setup_supabase_db.sh` append it).
- `EHR_POSTGRES_DSN` maps to `settings.postgres_dsn` in `ehr-api` (`EHR_` prefix).
- Do not commit real Supabase passwords; use `infra/.env.supabase.example` as a template only.
- For production later: disable OTP/M-Pesa simulate, enable OIDC, set `EHR_DEPLOYMENT_ENV=production`.
