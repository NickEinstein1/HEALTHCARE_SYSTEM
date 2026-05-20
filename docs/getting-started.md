# How to run UniHealth (start to end)

This guide walks you through running the **full application** on your laptop: **backend** (data plane + API + auth) first, then **frontend** (React portals), then sign-in and smoke checks.

**Recommended path:** staging Docker stack (matches pilot OIDC and port **8100**).

---

## What you are starting

```text
┌─────────────────────────────────────────────────────────────────┐
│  Browser  http://localhost:5173  (React / Vite)                 │
│       │  FHIR, /ai, /auth, …  →  http://localhost:8100         │
│       │  OIDC token  →  http://localhost:8180  (Keycloak)      │
└───────┼─────────────────────────────────────────────────────────┘
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Gateway (ehr-api)     :8100   FastAPI — reads/writes FHIR      │
│  Consumer              Docker  Kafka → Postgres + Redis         │
│  Kafka + Redis + Postgres        Docker                         │
│  Keycloak              :8180   Staff sign-in (OIDC)             │
└─────────────────────────────────────────────────────────────────┘
```

| Layer        | Technology        | Host port (staging) |
| ------------ | ----------------- | ------------------- |
| Frontend     | React + Vite      | **5173**            |
| API gateway  | FastAPI (`ehr-api`) | **8100**          |
| Identity     | Keycloak          | **8180**            |
| Event bus    | Kafka             | **9092**            |
| Cache / DB   | Redis, PostgreSQL | Docker internal   |

---

## Prerequisites

Install once on your machine:

| Tool | Purpose | Check |
| ---- | ------- | ----- |
| **Docker Desktop** (or Docker Engine + Compose) | Kafka, Postgres, Redis, gateway, consumer, Keycloak | `docker compose version` |
| **Node.js 18+** and **npm** | Frontend dev server | `node -v` && `npm -v` |
| **curl** | Health / smoke checks | `curl --version` |
| **jq** (optional) | OIDC smoke in scripts | `jq --version` |

Clone or open the repo:

```bash
cd /path/to/HEALTHCARE_SYSTEM
```

---

## Part 1 — Backend (start to end)

All backend services run in Docker for staging. One script brings them up and verifies them.

### Step 1.1 — Create staging env (first time only)

```bash
cp infra/.env.staging.example infra/.env.staging
```

Defaults are fine for laptop use. For a shared VM, change `POSTGRES_PASSWORD` and `KEYCLOAK_ADMIN_PASSWORD` in `infra/.env.staging`.

### Step 1.2 — Start the stack

From the **repository root**:

```bash
./scripts/run_staging.sh
```

This will:

1. Run `docker compose -f infra/docker-compose.staging.yml --env-file infra/.env.staging up -d --build`
2. Wait until the gateway answers on **[localhost:8100/health](http://localhost:8100/health)**
3. Run **smoke tests** (OIDC, sample patient `P001`, ingest E2E)

First run can take several minutes (image builds). Later starts are faster.

### Step 1.3 — Confirm backend URLs

| What | URL |
| ---- | --- |
| Health | [localhost:8100/health](http://localhost:8100/health) |
| OpenAPI / Swagger | [localhost:8100/docs](http://localhost:8100/docs) |
| Auth status | [localhost:8100/auth/status](http://localhost:8100/auth/status) |
| Keycloak admin | [localhost:8180](http://localhost:8180) (admin / password from `.env.staging`) |

Quick manual check:

```bash
curl -s http://localhost:8100/health | head -c 200
echo
curl -s http://localhost:8100/auth/status
```

Sample FHIR read (header fallback still enabled in staging):

```bash
curl -s -H "X-Facility-Id: FAC-A" \
  "http://localhost:8100/fhir/r5/Patient/P001/summary?encounters=5" | head -c 400
echo
```

### Step 1.4 — Optional backend-only smoke scripts

```bash
EHR_GATEWAY_URL=http://localhost:8100 ./scripts/smoke_phase1.sh
EHR_GATEWAY_URL=http://localhost:8100 ./scripts/verify_phase1_e2e.sh
EHR_GATEWAY_URL=http://localhost:8100 ./scripts/smoke_phase3_ai.sh
```

### Step 1.5 — View backend logs (if something fails)

```bash
docker compose -f infra/docker-compose.staging.yml \
  --env-file infra/.env.staging ps

docker compose -f infra/docker-compose.staging.yml \
  --env-file infra/.env.staging logs -f gateway

docker compose -f infra/docker-compose.staging.yml \
  --env-file infra/.env.staging logs -f consumer
```

**Backend is ready** when `run_staging.sh` finishes with `Staging smoke OK.` and `curl` to `/health` works.

---

## Part 2 — Frontend (start to end)

The UI is a separate process: Vite dev server on your host, talking to the gateway on **8100**.

### Step 2.1 — Configure frontend for staging

From the **repository root** (once per machine, or after changing API URL):

```bash
./scripts/setup_frontend_staging.sh
```

This copies `frontend/app/.env.staging.example` → `frontend/app/.env` with:

- `VITE_API_BASE_URL=http://localhost:8100`
- `VITE_OIDC_ENABLED=true`
- `VITE_OIDC_ISSUER=http://localhost:8180/realms/unihealth`

### Step 2.2 — Install dependencies (first time only)

```bash
cd frontend/app
npm install
```

### Step 2.3 — Start the dev server

```bash
cd frontend/app
npm run dev
```

Vite prints a local URL, typically:

**[localhost:5173](http://localhost:5173)**

Leave this terminal open while you use the app.

### Step 2.4 — Open the app in the browser

1. Go to **[localhost:5173](http://localhost:5173)**
2. Use **Sign in** (staff flow)
3. Choose a role path or go directly to staff sign-in

**Pilot staff accounts** (Keycloak):

| Username | Password    | Dashboard        |
| -------- | ----------- | ---------------- |
| doctor   | Changeme1!  | Doctor workstation |
| nurse    | Changeme1!  | Nurse station      |
| admin    | Changeme1!  | Admin console      |

After sign-in, the UI calls the gateway with a **Bearer token**; dashboards load FHIR and `/ai` data from **:8100**.

**Frontend is ready** when you can sign in and open a role dashboard without network errors in the browser console.

---

## Part 3 — End-to-end flow (what to click / test)

```text
1. Backend up     ./scripts/run_staging.sh
2. Frontend up    cd frontend/app && npm run dev
3. Browser        http://localhost:5173
4. Sign in        doctor / Changeme1!
5. Dashboard      Patient list, summary, AI widgets use live API
```

Suggested checks after sign-in:

- **Doctor / Nurse:** patient summary, observations, medications, ward/AI panels
- **Admin:** overview KPIs, facilities (uses live or demo data depending on screen)
- **API docs:** [localhost:8100/docs](http://localhost:8100/docs) — try `GET /fhir/r5/Patient/P001/summary` with `X-Facility-Id: FAC-A` or Bearer token from Keycloak

---

## Part 4 — Stop everything

**Frontend:** `Ctrl+C` in the terminal running `npm run dev`.

**Backend:**

```bash
./scripts/stop_staging.sh
```

Remove database volumes as well:

```bash
./scripts/stop_staging.sh --purge
```

---

## Alternative: local dev without Keycloak (port 8000)

Use this only if you want a **lighter** backend without OIDC (header-based role only).

**Terminal 1 — backend:**

```bash
./scripts/run_full_flow.sh
```

Gateway listens on **[localhost:8000](http://localhost:8000)** (not 8100).

**Terminal 2 — frontend:**

```bash
cd frontend/app
npm install
# No OIDC — use default Vite proxy to :8000 (do not use .env.staging)
rm -f .env   # or ensure VITE_OIDC_ENABLED is not true
npm run dev
```

Sign-in uses the in-app pilot flow with `X-UniHealth-Role`, not Keycloak.

---

## Access from another device (same Wi‑Fi)

See **[runbook-staging.md](runbook-staging.md)** — LAN overlay and `npm run dev -- --host`.

Short version:

1. `export LAN_HOST=$(ipconfig getifaddr en0)`  # your laptop IP
2. Restart compose with `infra/docker-compose.staging.lan.yml`
3. `npm run dev -- --host` and open `http://<LAN_HOST>:5173` from tablet

---

## Troubleshooting

| Problem | Likely cause | Fix |
| ------- | ------------- | --- |
| **500** on nurse patient chart | UI calling **:8000** while staging API is on **:8100** | `./scripts/setup_frontend_staging.sh`, restart `npm run dev`, confirm `curl http://localhost:8100/health` |
| `run_staging.sh` hangs on gateway | Docker still starting / build failed | `docker compose ... logs gateway`; wait or `docker compose ... up -d --build` again |
| Frontend: “Failed to fetch /fhir…” | Wrong API URL or backend down | Ensure `frontend/app/.env` has `VITE_API_BASE_URL=http://localhost:8100`; curl `/health` |
| Sign-in: OIDC error | Keycloak not ready | Wait 1–2 min; open [localhost:8180](http://localhost:8180) |
| “Account is not fully set up” | Keycloak user profile | Users in `infra/keycloak/realm-unihealth.json` need first + last name |
| No patient `P001` | Data not seeded | `./scripts/smoke_staging.sh` or `./scripts/run_staging.sh` again |
| Port 8100 already in use | Another process | `lsof -i :8100` or change host port in `docker-compose.staging.yml` |

---

## Command cheat sheet

```bash
# === RECOMMENDED: full staging (backend) ===
./scripts/run_staging.sh

# === Frontend ===
./scripts/setup_frontend_staging.sh
cd frontend/app && npm run dev

# === Verify ===
curl -s http://localhost:8100/health
EHR_GATEWAY_URL=http://localhost:8100 ./scripts/smoke_phase1.sh

# === Stop ===
./scripts/stop_staging.sh
```

---

## Related documentation

| Doc | Contents |
| --- | -------- |
| [runbook-staging.md](runbook-staging.md) | LAN, multi-machine checklist, ops detail |
| [phase1-staging.md](phase1-staging.md) | Compose services and env vars |
| [frontend.md](frontend.md) | React app structure and proxy |
| [ehr-api.md](ehr-api.md) | API routes and environment |
| [phase1-complete.md](phase1-complete.md) | Phase 1 sign-off and benchmarks |
