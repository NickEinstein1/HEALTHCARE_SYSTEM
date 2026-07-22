# Hostinger VPS deploy guide — UniHealth

Step-by-step for **Hostinger VPS** (Ubuntu). Companion to [vps-production-deploy.md](vps-production-deploy.md).

## Before you start (on your Mac)

1. Push the latest code (including VPS files) to GitHub:
   ```bash
   git status
   # commit + push infra/docker-compose.vps.yml, docs/, frontend/app/Dockerfile.vps, etc.
   git push origin main
   ```
2. Have ready:
   - Hostinger VPS **IP address**
   - SSH password or key
   - Domain (or Hostinger domain)
   - Supabase **Session pooler** connection string (IPv4)

## A. Hostinger panel

1. VPS is running **Ubuntu 22.04 or 24.04**.
2. Note the **root password** (or set an SSH key) and **public IP**.
3. Optional: open **Browser terminal** in hPanel, or use SSH from your Mac:
   ```bash
   ssh root@YOUR_VPS_IP
   ```

## B. DNS (Hostinger domain or external)

In Hostinger → Domains → DNS / DNS Zone, create **A records** (all pointing to your VPS IP):

| Type | Name | Points to |
|------|------|-----------|
| A | `app` | VPS IP |
| A | `api` | VPS IP |
| A | `auth` | VPS IP |

Wait 5–30 minutes for DNS. Check:

```bash
dig +short app.yourdomain.com
dig +short api.yourdomain.com
dig +short auth.yourdomain.com
```

## C. First login — install Docker, nginx, git

On the VPS (as root):

```bash
apt-get update
apt-get install -y ca-certificates curl git ufw

# Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker --version
docker compose version

# Firewall (Hostinger often has a panel firewall too — open 22, 80, 443 there as well)
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

## D. Clone the repo

```bash
cd /opt
git clone https://github.com/NickEinstein1/HEALTHCARE_SYSTEM.git unihealth
cd /opt/unihealth
```

If the repo is **private**, use a GitHub personal access token or deploy key:

```bash
git clone https://<TOKEN>@github.com/NickEinstein1/HEALTHCARE_SYSTEM.git unihealth
```

## E. Create `infra/.env.vps`

```bash
cp infra/.env.vps.example infra/.env.vps
chmod 600 infra/.env.vps
nano infra/.env.vps
```

Fill at least:

```bash
APP_HOSTNAME=app.yourdomain.com
API_HOSTNAME=api.yourdomain.com
AUTH_HOSTNAME=auth.yourdomain.com

EHR_POSTGRES_DSN=postgresql://postgres.YOUR_REF:YOUR_PASSWORD@aws-1-REGION.pooler.supabase.com:5432/postgres?sslmode=require

REDIS_PASSWORD=...          # openssl rand -base64 32
KEYCLOAK_DB_PASSWORD=...
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=...
EHR_PATIENT_SESSION_SECRET=...  # openssl rand -base64 48
```

Generate secrets on the VPS:

```bash
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 32
openssl rand -base64 48
```

## F. Start UniHealth containers

```bash
cd /opt/unihealth
docker compose -f infra/docker-compose.vps.yml --env-file infra/.env.vps up -d --build
docker compose -f infra/docker-compose.vps.yml --env-file infra/.env.vps ps
```

First build can take several minutes. Healthy services: `redis`, `keycloak-db`, `keycloak`, `gateway`, `web`.

Quick local check on the VPS:

```bash
curl -s http://127.0.0.1:8100/health
curl -s http://127.0.0.1:8088/ | head
```

## G. Nginx + Let’s Encrypt (TLS)

```bash
apt-get install -y nginx certbot python3-certbot-nginx

cp /opt/unihealth/infra/nginx/vps-tls.conf.example /etc/nginx/sites-available/unihealth
nano /etc/nginx/sites-available/unihealth
# Replace every yourdomain.com with your real domain
# Comment out ssl_certificate lines temporarily OR use certbot --nginx which edits them

ln -sf /etc/nginx/sites-available/unihealth /etc/nginx/sites-enabled/unihealth
rm -f /etc/nginx/sites-enabled/default
```

**Easier path for first TLS:** use HTTP-only nginx stubs, then certbot:

Create a minimal HTTP config first if the SSL paths don’t exist yet:

```bash
# Temporary HTTP reverse proxy (certbot will upgrade to HTTPS)
cat >/etc/nginx/sites-available/unihealth <<EOF
server {
  listen 80;
  server_name app.yourdomain.com;
  location / { proxy_pass http://127.0.0.1:8088; proxy_set_header Host \$host; }
}
server {
  listen 80;
  server_name api.yourdomain.com;
  location / { proxy_pass http://127.0.0.1:8100; proxy_set_header Host \$host; proxy_set_header X-Forwarded-Proto \$scheme; }
}
server {
  listen 80;
  server_name auth.yourdomain.com;
  location / {
    proxy_pass http://127.0.0.1:8180;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
  }
}
EOF

nginx -t && systemctl reload nginx

certbot --nginx -d app.yourdomain.com -d api.yourdomain.com -d auth.yourdomain.com
```

## H. Keycloak (official sign-in)

1. Open `https://auth.yourdomain.com`
2. Admin console → login with `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`
3. Realm **unihealth** → Client **unihealth-spa**:
   - Valid redirect URIs: `https://app.yourdomain.com/*`
   - Web origins: `https://app.yourdomain.com`
4. Users → rotate pilot passwords (`Changeme1!`) or create real admins with roles (`admin`, `doctor`, …)

## I. Verify

```bash
curl -s https://api.yourdomain.com/health
curl -s https://api.yourdomain.com/auth/status
# Browser: https://app.yourdomain.com/sign-in
```

Seed staff metadata into Supabase (optional, no passwords):

```bash
apt-get install -y postgresql-client
export EHR_POSTGRES_DSN='…from .env.vps…'
psql "$EHR_POSTGRES_DSN" -f /opt/unihealth/scripts/seed_pilot_staff.sql
```

## Hostinger-specific tips

| Issue | Fix |
|-------|-----|
| Can’t SSH | Use hPanel → VPS → Browser terminal; reset root password |
| DNS not updating | Use Hostinger DNS; wait; disable Cloudflare proxy (orange cloud) until certs work |
| Port blocked | hPanel → Firewall → allow 22, 80, 443 |
| Out of memory on build | Use 4 GB VPS, or build images on CI and pull; close other apps |
| Repo not found | Push VPS files to `main` first; or `scp` the project to `/opt/unihealth` |

## Copy files without Git (alternative)

From your Mac:

```bash
rsync -avz --exclude node_modules --exclude .venv --exclude .git \
  ~/Documents/Projects/HEALTHCARE_SYSTEM/ root@YOUR_VPS_IP:/opt/unihealth/
```

Then continue from **E** on the VPS.

## Security reminders

- Never commit `infra/.env.vps`
- Do not open ports 8100 / 8180 / 8088 in Hostinger firewall
- Rotate Supabase DB password if it was shared earlier
