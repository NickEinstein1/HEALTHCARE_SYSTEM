#!/usr/bin/env bash
# Fix UniHealth VPS auth (Keycloak 502 → doctor "Failed to fetch")
# Run ON the VPS as root:
#   bash /opt/unihealth/scripts/fix-vps-auth.sh
set -euo pipefail

cd /opt/unihealth

echo "==> Compose status"
docker compose -f infra/docker-compose.vps.yml --env-file infra/.env.vps ps

echo "==> Restart keycloak-db + keycloak"
docker compose -f infra/docker-compose.vps.yml --env-file infra/.env.vps up -d keycloak-db redis
docker compose -f infra/docker-compose.vps.yml --env-file infra/.env.vps up -d keycloak

echo "==> Wait for Keycloak (up to ~2 min)"
ok=0
for i in $(seq 1 40); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8180/realms/unihealth || true)
  if [ "$code" = "200" ]; then
    echo "Keycloak local OK ($code) after ${i}x3s"
    ok=1
    break
  fi
  echo "  attempt $i: HTTP $code"
  sleep 3
done

if [ "$ok" != "1" ]; then
  echo "ERROR: Keycloak did not become healthy on :8180"
  docker compose -f infra/docker-compose.vps.yml --env-file infra/.env.vps logs keycloak --tail 60
  exit 1
fi

echo "==> Ensure nginx proxies auth → 127.0.0.1:8180"
if [ ! -f /etc/nginx/sites-available/unihealth ]; then
  cat >/etc/nginx/sites-available/unihealth <<'EOF'
server {
  listen 80;
  server_name app.unihealth360.com;
  location / {
    proxy_pass http://127.0.0.1:8088;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
server {
  listen 80;
  server_name api.unihealth360.com;
  location / {
    proxy_pass http://127.0.0.1:8100;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
server {
  listen 80;
  server_name auth.unihealth360.com;
  location / {
    proxy_pass http://127.0.0.1:8180;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_buffer_size 128k;
    proxy_buffers 4 256k;
  }
}
EOF
  ln -sf /etc/nginx/sites-available/unihealth /etc/nginx/sites-enabled/unihealth
fi

nginx -t && systemctl reload nginx

echo "==> Verify"
echo -n "local keycloak: "; curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8180/realms/unihealth
echo -n "https auth:     "; curl -s -o /dev/null -w "%{http_code}\n" https://auth.unihealth360.com/realms/unihealth || echo "000"
echo -n "https api:      "; curl -s -o /dev/null -w "%{http_code}\n" https://api.unihealth360.com/health || echo "000"

echo "==> Done. Try doctor login: doctor / Changeme1!"
