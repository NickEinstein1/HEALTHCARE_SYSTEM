# UniHealth

Next-generation national Electronic Health Record system (see [Blueprint](docs/UniHealth-EHR-Blueprint.md)). This repo contains **Phase 1: MVP** (complete) — edge FHIR gateway, event pipeline, and load tests targeting **P95 &lt;50 ms** for patient + recent encounter lookup. Sign-off: [docs/phase1-complete.md](docs/phase1-complete.md).

## Laptop staging (recommended)

Full stack with OIDC on **:8100** + UI on **:5173**:

```bash
./scripts/run_staging.sh
./scripts/setup_frontend_staging.sh
cd frontend/app && npm run dev
```

**Full walkthrough (backend → frontend → sign-in):** **[docs/getting-started.md](docs/getting-started.md)**  

See also **[docs/runbook-staging.md](docs/runbook-staging.md)** for LAN access, smoke checks, and running on other machines.

## Phase 1 quick start (local dev, no Keycloak)

**One-shot full flow (after Docker is running):**

```bash
./scripts/run_full_flow.sh
```

Then open <http://localhost:8000/docs> or run:
`curl -H "X-Facility-Id: FAC-A" http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5`

**Manual steps:**

### 1. Start infrastructure

```bash
cd infra && docker compose up -d && cd ..
```

### 2. Database schema and seed data

```bash
psql -U ehr -d ehr -h localhost -f ehr-api/schema.sql
cd ehr-api && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cd ..
# Seed from repo root with ehr-api venv active (so asyncpg is available)
source ehr-api/.venv/bin/activate && python scripts/seed_data.py
```

### 3. Run the EHR gateway

```bash
cd ehr-api && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

### 4. Test

```bash
curl -H "X-Facility-Id: FAC-A" http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5
```

### 5. Load test (P95 &lt;50 ms)

Install [k6](https://k6.io), then:

```bash
BASE_URL=http://localhost:8000 k6 run load-tests/gateway-latency.js
```

Phase 1 verification (gateway running):

```bash
./scripts/smoke_phase1.sh
./scripts/verify_phase1_e2e.sh   # needs consumer + Kafka
```

## Full flow (event-driven path)

To test the full pipeline **Kafka → consumer → Postgres/Redis → gateway** (no direct DB seed):

1. Start infra and apply schema (no `seed_data.py`):

   ```bash
   cd infra && docker compose up -d && cd ..
   psql -U ehr -d ehr -h localhost -f ehr-api/schema.sql
   ```

2. Start the **consumer** (in one terminal; it will wait for events):

   ```bash
   cd edge-pipeline && python -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt && python -m consumer.main
   ```

3. In another terminal, **produce** sample events:

   ```bash
   pip install -r scripts/requirements.txt
   python scripts/produce_sample_events.py
   ```

   The consumer will upsert patients/encounters/observations/medication_requests into Postgres and invalidate Redis caches.

4. Start the **gateway** and query:

   ```bash
   cd ehr-api && source .venv/bin/activate && uvicorn app.main:app --port 8000
   curl -H "X-Facility-Id: FAC-A" http://localhost:8000/fhir/r5/Patient/P001/summary?encounters=5
   curl -H "X-Facility-Id: FAC-A" http://localhost:8000/fhir/r5/Patient/P001/observations?limit=20
   curl -H "X-Facility-Id: FAC-A" http://localhost:8000/fhir/r5/Patient/P001/medication-requests?limit=20
   ```

   First request hits Postgres (cache miss); subsequent requests are served from Redis (&lt;50 ms).

## Documentation style

**Documentation** lives under **[docs/](docs/)** ([index](docs/README.md)). The root `README.md` is the repo entry point only. All docs use [markdown-style.md](docs/markdown-style.md) and [`.markdownlint.jsonc`](.markdownlint.jsonc). VS Code/Cursor: [`.cursor/rules/markdown.mdc`](.cursor/rules/markdown.mdc).

## Repo layout

| Path                         | Description                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| [docs/](docs/)               | **All documentation** — [index](docs/README.md), blueprint, runbooks, component guides |
| [infra/](infra/)             | Docker Compose (Kafka, Redis, PostgreSQL)                                                |
| [ehr-api/](ehr-api/)         | Edge FHIR gateway (FastAPI; Redis → Postgres) + **Phase 3** `/ai` simulator                |
| [frontend/](frontend/)       | React clinician portals (Doctor / Nurse / Admin; consumes gateway)                       |
| [edge-pipeline/](edge-pipeline/) | Kafka consumer → Redis + Postgres                                                    |
| [load-tests/](load-tests/)   | k6 latency test                                                                          |
| [scripts/](scripts/)         | Seed data, Kafka producer, **Phase 3 AI smoke** (`smoke_phase3_ai.sh`), full flow         |

## Frontend (portal)

See **[docs/frontend.md](docs/frontend.md)** for the five former “next step” gaps (React split, tokens, auth, proxy/production routing, deployment pattern) — each is solved or intentionally scoped for pilot vs production OAuth.

Quick start:

```bash
cd frontend/app && npm install && npm run dev
```

Ensure the gateway is listening on **`http://localhost:8000`** while using the Vite dev server (proxies **`/ai`**, **`/fhir`**, **`/appointments`**, **`/consent`**, etc.).

Production build checks run in CI (`npm run lint` + `npm run build`).

## Phase 1 success criteria

- P95 latency for `GET /fhir/r5/Patient/{id}/summary` **&lt;50 ms**
- No duplicate data entry for shared patients (event-driven sync via Kafka)
- 99.9% uptime during pilot

See [docs/phase1-plan.md](docs/phase1-plan.md) for full scope and timeline.

## Phase 3 AI Assist pilot (integrated)

Phase 3 lives on the **same gateway** (`ehr-api`). It exposes `/ai/*` (diagnosis hints, anomalies, NEWS2, **ward occupancy + bed forecasts**, WebSocket alerts) with an in-memory simulator that bootstraps on startup.

| What                                                                               | Where                                                                                                      |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Env vars (`EHR_AI_CENSUS_INTEGRATION_SECRET`, SQLite replay, Redis idempotency, …) | [docs/ehr-api.md — Environment](docs/ehr-api.md#environment)                                               |
| Doctor / Nurse UI (ward forecast, census inputs)                                   | [docs/frontend.md](docs/frontend.md); run `cd frontend/app && npm run dev` → doctor or nurse dashboard   |
| Contract tests                                                                     | `cd ehr-api && PYTHONPATH=. pytest tests/ -q`                                                              |

Quick sanity (gateway must be listening; default port from your run):

```bash
curl -s "http://localhost:8000/ai/status"
curl -s -H "X-UniHealth-Role: doctor" "http://localhost:8000/ai/wards" | head -c 300
echo
```

Standalone smoke script:

```bash
./scripts/smoke_phase3_ai.sh            # assumes http://localhost:8000
EHR_GATEWAY_URL=http://localhost:8100 ./scripts/smoke_phase3_ai.sh
```

For **multi-worker production**, set **`EHR_INTEGRATION_IDEMPOTENCY_REDIS=true`** against your shared Redis (`EHR_REDIS_URL`). See **[docs/ehr-api.md](docs/ehr-api.md)** for integration census and HL7 pilot routes.

## CI/CD (GitHub Actions)

This repo includes two workflows:

- `CI` (`.github/workflows/ci.yml`)
  - Triggers on push to `main` and pull requests.
  - Runs Python lint checks (`ruff`), root `pytest`, **all** `ehr-api/tests/` (Phase 3 + idempotency), and **frontend** `npm run lint` + `npm run build`.

- `k6 Scheduled Smoke` (`.github/workflows/k6-scheduled.yml`)
  - Runs nightly and can also be triggered manually.
  - Runs `load-tests/gateway-latency.js` only when `K6_BASE_URL` is configured.

### Optional: enable scheduled k6

When you are ready, configure this repository secret in GitHub:

- `K6_BASE_URL` = URL of your deployed gateway environment (for example, staging).

If the secret is not set, the scheduled workflow exits successfully and skips k6.

### k6 target readiness checklist

Before relying on scheduled k6 results, verify the target environment:

- **Gateway is reachable:** `GET {K6_BASE_URL}/health` returns `200`.
- **Test data is present:** patient `P001` exists with at least one encounter.
- **Header compatibility:** summary endpoint accepts `X-Facility-Id: FAC-A`.
- **Consent behavior is understood:** if strict mode is enabled, ensure test consent exists or run with `scope=emergency`.
- **Latency interpretation:** compare k6 `P95` with the Phase 1 target (`<50 ms`) and investigate regressions early.
