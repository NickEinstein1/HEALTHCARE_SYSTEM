# Laptop staging runbook

Use this when you are on the **laptop / staging phase**: one machine runs the full stack; other browsers (same laptop, phone, colleague) can hit the same APIs and UI.

## Three ways to run

| Mode | When | Command |
| ---- | ---- | ------- |
| **A — Staging Docker** (recommended) | Full stack + OIDC like a pilot edge node | `./scripts/run_staging.sh` |
| **B — Local split** | Fast API hacking without Keycloak | `./scripts/run_full_flow.sh` |
| **C — LAN staging** | Tablet / second PC on same Wi‑Fi | See [LAN access](#lan-access-other-devices) |

---

## A — Staging Docker (this laptop)

### 1. Start backend

```bash
./scripts/run_staging.sh
```

This starts Kafka, Redis, Postgres, Keycloak, consumer, and gateway on **:8100**, then runs `smoke_staging.sh`.

| Service  | URL |
| -------- | --- |
| Gateway  | [localhost:8100](http://localhost:8100) |
| API docs | [localhost:8100/docs](http://localhost:8100/docs) |
| Keycloak | [localhost:8180](http://localhost:8180) |
| Kafka    | `localhost:9092` |

### 2. Start frontend

```bash
./scripts/setup_frontend_staging.sh
cd frontend/app && npm run dev
```

Open [localhost:5173](http://localhost:5173) → **Sign in** → role dashboards.

**Staff pilot users** (Keycloak):

| User   | Password    | Role   |
| ------ | ----------- | ------ |
| doctor | Changeme1!  | doctor |
| nurse  | Changeme1!  | nurse  |
| admin  | Changeme1!  | admin  |

### 3. Quick checks

```bash
curl -s http://localhost:8100/health
EHR_GATEWAY_URL=http://localhost:8100 ./scripts/smoke_phase1.sh
EHR_GATEWAY_URL=http://localhost:8100 ./scripts/smoke_phase3_ai.sh
```

### 4. Stop

```bash
./scripts/stop_staging.sh          # keep DB
./scripts/stop_staging.sh --purge  # wipe volumes
```

---

## B — Local split (no staging compose)

Gateway on **:8000**, OIDC off, `X-UniHealth-Role` header:

```bash
./scripts/run_full_flow.sh
cd frontend/app && npm install && npm run dev
```

Use when you only need FHIR + Kafka without Keycloak.

---

## LAN access (other devices)

Goal: phone or another laptop opens the **same** UniHealth UI and APIs.

### On the host laptop (runs Docker)

1. Find LAN IP (macOS): `ipconfig getifaddr en0`
2. Export it and restart stack with LAN overlay:

```bash
export LAN_HOST=192.168.1.42   # your IP
docker compose -f infra/docker-compose.staging.yml \
  -f infra/docker-compose.staging.lan.yml \
  --env-file infra/.env.staging up -d --build
./scripts/smoke_staging.sh
```

1. Allow firewall inbound **8100**, **8180**, **5173** if prompted.

### On the device running the UI

Option 1 — **Dev server on host**, others use host IP:

```bash
cd frontend/app && npm run dev -- --host
```

Open `http://<LAN_HOST>:5173` from the tablet (uses host Vite + proxy).

Option 2 — **Frontend env points at host APIs** (frontend on second machine):

Copy `frontend/app/.env.staging.lan.example` → `.env`, set `192.168.1.42` to host IP, then `npm run dev`.

---

## Running on “various places” (checklist)

Use this order when you need the system **done and running everywhere** you care about:

| Step | Place | Action |
| ---- | ----- | ------ |
| 1 | This laptop | `./scripts/run_staging.sh` + `setup_frontend_staging.sh` + `npm run dev` |
| 2 | This laptop browser | Sign in as doctor/nurse/admin; open dashboards |
| 3 | Same Wi‑Fi | LAN overlay + `npm run dev -- --host` or `.env.staging.lan` |
| 4 | CI / GitHub | Workflows already lint, test, build; optional `K6_BASE_URL` secret |
| 5 | Cloud VM / hospital edge | Copy repo, install Docker, run same `run_staging.sh` (change passwords in `.env.staging`) |
| 6 | Next program phase | Production TLS, OIDC hardening, real EMR adapter — [phase1-next-steps.md](phase1-next-steps.md) |

---

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| Frontend 404 on `/fhir` | Set `VITE_API_BASE_URL=http://localhost:8100` in `frontend/app/.env` |
| OIDC “Account is not fully set up” | Keycloak users need first + last name (see `realm-unihealth.json`) |
| `P001` not found | Run `./scripts/smoke_staging.sh` (seeds via Kafka) or `produce_sample_events.py` |
| Consumer lag | `docker compose ... logs -f consumer` |
| Port 8100 in use | `EHR_GATEWAY_URL=http://localhost:8101` after changing compose port |

---

## Related docs

- [phase1-staging.md](phase1-staging.md) — compose services and env vars
- [phase1-complete.md](phase1-complete.md) — sign-off and benchmarks
- [phase1-next-steps.md](phase1-next-steps.md) — Blueprint Phase 2 after staging is stable
