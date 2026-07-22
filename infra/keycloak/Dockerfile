FROM quay.io/keycloak/keycloak:24.0

COPY realm-unihealth.json /opt/keycloak/data/import/realm-unihealth.json

# Build for Postgres + reverse-proxy (production)
ENV KC_DB=postgres
ENV KC_HEALTH_ENABLED=true
ENV KC_HTTP_ENABLED=true
RUN /opt/keycloak/bin/kc.sh build

# Default command overridden by compose; keep a safe production default
CMD ["start", "--optimized", "--import-realm"]
