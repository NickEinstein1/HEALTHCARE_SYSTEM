# VPS production deploy — UniHealth online (no laptop dependency)

This runbook puts the full system online:

| Layer | Where it runs |
|-------|----------------|
| Clinical / billing / UHIC DB | **Supabase** (already set up) |
| Sign-in (OIDC / passwords) | **Keycloak on your VPS** |
| API gateway | **ehr-api on your VPS** |
| Web frontend | **Static SPA on your VPS** |
| TLS | **Nginx + Let’s Encrypt on the VPS** |

Your Mac is only used to deploy and administer — day-to-day login does **not** need Docker on your laptop.

```text
  Browser ──HTTPS──► app.yourdomain.com     (web)
                     api.yourdomain.com     (ehr-api)
                     auth.yourdomain.com    (Keycloak)
                           │
                           ▼
                     VPS Docker stack
                           │
                     EHR_POSTGRES_DSN ──► Supabase Postgres
```

## Prerequisites

1. A VPS (2–4 GB RAM minimum; 4 GB recommended) with Ubuntu 22.04+, Docker + Compose plugin.
2. A domain with DNS:
   - `app.` → VPS IP  
   - `api.` → VPS IP  
   - `auth.` → VPS IP  
3. Supabase project with schema applied (`./scripts/setup_supabase_db.sh`).
4. Git access to this repo on the VPS.

## 1. Clone and configure

```bash
git clone <your-repo-url> unihealth && cd unihealth
cp infra/.env.vps.example infra/.env.vps
nano infra/.env.vps   # fill every CHANGE_ME + hostnames + Supabase DSN
```

Generate secrets:

```bash
openssl rand -base64 32   # REDIS_PASSWORD
openssl rand -base64 32   # KEYCLOAK_DB_PASSWORD
openssl rand -base64 32   # KEYCLOAK_ADMIN_PASSWORD
openssl rand -base64 48   # EHR_PATIENT_SESSION_SECRET
```

Use the **Session pooler** Supabase URI (IPv4), e.g.:

```text
postgresql://postgres.<ref>:<password>@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require
```

## 2. Start the stack

```bash
docker compose -f infra/docker-compose.vps.yml --env-file infra/.env.vps up -d --build
docker compose -f infra/docker-compose.vps.yml --env-file infra/.env.vps ps
```

Services (localhost only — not public until nginx):

| Port | Service |
|------|---------|
| 8088 | Web SPA |
| 8100 | API |
| 8180 | Keycloak |

## 3. TLS (host nginx + certbot)

```bash
sudo apt-get update && sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp infra/nginx/vps-tls.conf.example /etc/nginx/sites-available/unihealth
# edit server_name + certificate paths to your domain
sudo ln -sf /etc/nginx/sites-available/unihealth /etc/nginx/sites-enabled/unihealth
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com -d auth.yourdomain.com
```

## 4. Harden Keycloak (required for professional login)

Open `https://auth.yourdomain.com` → Administration Console (`KEYCLOAK_ADMIN` / password from `.env.vps`).

1. Realm **unihealth** (imported from `realm-unihealth.json`).
2. Client **unihealth-spa**:
   - Valid redirect URIs: `https://app.yourdomain.com/*`
   - Web origins: `https://app.yourdomain.com`
   - For production: prefer **Standard flow + PKCE**; disable **Direct access grants** once the SPA uses authorization code flow.
3. **Rotate** all pilot passwords (`Changeme1!`) — create real operator accounts.
4. Each user needs a realm role: `admin`, `doctor`, `nurse`, `billing`, `lab`, `pharmacy`, or `patient`.
5. Optional claim: user attribute / mapper `unihealth_role` matching that role.

Mirror staff metadata into Supabase (no passwords):

```bash
export EHR_POSTGRES_DSN='…same as .env.vps…'
psql "$EHR_POSTGRES_DSN" -f scripts/seed_pilot_staff.sql
```

## 5. Verify online

```bash
curl -s https://api.yourdomain.com/health
curl -s https://api.yourdomain.com/auth/status | jq .
# Expect: production_profile true, oidc_enabled true, header_fallback false, otp_simulate false

EHR_GATEWAY_URL=https://api.yourdomain.com ./scripts/smoke_go_live.sh
```

Then open `https://app.yourdomain.com/sign-in` and sign in with a Keycloak user.

## Security checklist

- [ ] No ports 8100/8180/8088 exposed publicly (only 80/443)
- [ ] `EHR_DEPLOYMENT_ENV=production` (enforced in compose)
- [ ] Header role fallback **off**
- [ ] OTP / M-Pesa simulate **off**
- [ ] Strong secrets in `.env.vps` (file mode `600`, never in git)
- [ ] Keycloak HTTPS hostname strict
- [ ] Pilot passwords rotated
- [ ] Supabase password rotated (if previously shared in chat)
- [ ] Firewall: `ufw allow 22,80,443/tcp` only
- [ ] Automatic security updates on the VPS

## What stays local vs online

| Before (laptop) | After (VPS) |
|-----------------|-------------|
| Docker Keycloak on `:8180` | Keycloak on `auth.` |
| Local/API Postgres or mixed | **Supabase only** for EHR data |
| Vite `npm run dev` | Built SPA on `app.` |
| Header-only pilot auth | **OIDC Bearer** required |

## Next (after first online login works)

1. Wire real SMS OTP provider  
2. Live M-Pesa credentials  
3. Disable Keycloak direct access grants + switch SPA to PKCE code flow  
4. Daily Supabase backups + VPS volume backups for Keycloak DB  

## Related

- [supabase-setup.md](supabase-setup.md)  
- [go-live-web-patient.md](go-live-web-patient.md)  
- [phase2-production.md](phase2-production.md)  
