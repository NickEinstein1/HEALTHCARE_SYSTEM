# Phase 1 staging stack

Docker Compose stack for pilot deployments: data plane (Kafka, Redis, Postgres), edge consumer, FHIR gateway, and Keycloak OIDC.

## Quick start (one command)

```bash
./scripts/run_staging.sh
./scripts/setup_frontend_staging.sh
cd frontend/app && npm run dev
```

Manual equivalent:

```bash
cp infra/.env.staging.example infra/.env.staging
docker compose -f infra/docker-compose.staging.yml --env-file infra/.env.staging up -d --build
./scripts/smoke_staging.sh
```

Full laptop + LAN guide: **[runbook-staging.md](runbook-staging.md)**.

| Service  | URL                                                        |
| -------- | ---------------------------------------------------------- |
| Gateway  | [http://localhost:8100](http://localhost:8100)             |
| Keycloak | [http://localhost:8180](http://localhost:8180)             |
| Kafka    | `localhost:9092`                                             |

## Keycloak pilot users

| Username | Password    | Realm role |
| -------- | ----------- | ---------- |
| doctor   | Changeme1!  | doctor     |
| nurse    | Changeme1!  | nurse      |
| admin    | Changeme1!  | admin      |
| lab      | Changeme1!  | lab        |
| pharmacy | Changeme1!  | pharmacy   |
| patient  | Changeme1!  | patient    |

Realm import: `infra/keycloak/realm-unihealth.json`.

## Frontend with OIDC

```bash
cd frontend/app
cp .env.example .env
# Set VITE_OIDC_ENABLED=true and VITE_OIDC_ISSUER=http://localhost:8180/realms/unihealth
npm run dev
```

Staff sign-in (staging): use Keycloak username matching role (`doctor`, `nurse`, `admin`, `lab`, `pharmacy`, `patient`) and password `Changeme1!`. Users must have **first and last name** set (Keycloak 24 user profile).

Gateway OIDC in Docker uses `EHR_OIDC_JWKS_URL` pointing at the internal Keycloak service while `EHR_OIDC_ISSUER_URL` stays `http://localhost:8180/realms/unihealth` to match browser-issued tokens.

## Gateway auth modes

- **Local dev** (`run_full_flow.sh`): `EHR_OIDC_ENABLED=false`, `X-UniHealth-Role` header.
- **Staging compose**: `EHR_OIDC_ENABLED=true` with `EHR_OIDC_ALLOW_HEADER_FALLBACK=true` so smoke scripts and legacy clients still work.

## Teardown

```bash
docker compose -f infra/docker-compose.staging.yml --env-file infra/.env.staging down -v
```
