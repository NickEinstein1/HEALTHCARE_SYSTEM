from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="EHR_")

    # development | staging | production — production enforces OIDC + strict consent defaults
    deployment_env: str = "development"

    redis_url: str = "redis://localhost:6379/0"
    postgres_dsn: str = "postgresql://ehr:ehr_dev_password@localhost:5432/ehr"
    cache_ttl_seconds: int = 300  # 5 min for patient summary
    default_encounters_limit: int = 5
    kafka_bootstrap_servers: str = "localhost:9092"
    # Consent behavior:
    # - permissive: allow reads if no explicit consent record exists (Phase 1 default for pilot)
    # - strict: deny reads unless an active consent exists for (patient, facility, scope)
    consent_mode: str = "permissive"
    # When non-empty: enables POST /ai/integration/wards/{ward_id}/census-snapshot
    # with matching X-AI-Census-Secret header (automation/ADT feeder path).
    ai_census_integration_secret: str = ""
    # Optional Phase 3 pilot: append SQLite rows on each hourly census mutation.
    ward_census_sqlite_path: str = ""
    # On API startup, replace simulator census histories + rollups when SQLite rows exist for a ward.
    replay_ward_census_sqlite: bool = False
    # Phase 3 integration: persist idempotency replay in Redis (EHR_REDIS_URL) so all workers share state.
    integration_idempotency_redis: bool = False

    # OIDC (Keycloak) — staging/production; header fallback for local dev.
    oidc_enabled: bool = False
    oidc_issuer_url: str = ""
    oidc_jwks_url: str = ""
    oidc_audience: str = "unihealth-gateway"
    oidc_role_claim: str = "unihealth_role"
    oidc_allow_header_fallback: bool = True

    # Phase 3 WebSocket alerts — dev shared secrets (comma-separated); disabled in production profile.
    ws_dev_tokens: str = "dev-token-1,dev-token-2"
    ws_allow_dev_tokens: bool = True

    @model_validator(mode="after")
    def _apply_deployment_profile(self) -> "Settings":
        env = (self.deployment_env or "development").strip().lower()
        if env == "production":
            self.consent_mode = "strict"
            self.oidc_allow_header_fallback = False
            self.ws_allow_dev_tokens = False
            if (self.oidc_issuer_url or "").strip():
                self.oidc_enabled = True
        elif env == "staging":
            # Staging keeps permissive consent by default but can enable OIDC via env
            pass
        return self

    @property
    def is_production(self) -> bool:
        return (self.deployment_env or "").strip().lower() == "production"


settings = Settings()
