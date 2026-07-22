from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="EHR_",
        env_file=(".env", ".env.supabase.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # development | staging | production — production enforces OIDC + strict consent defaults
    deployment_env: str = "development"

    # When true (default in development), API starts even if Postgres/Redis are down.
    # FHIR cache/DB routes degrade gracefully; in-memory modules (billing, UHIC) still work.
    infra_optional: bool = True

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

    # Patient OTP + gateway-issued session tokens (when Keycloak OIDC is off).
    # In production with OIDC, OTP is MFA only; access tokens come from Keycloak.
    patient_session_secret: str = "unihealth-dev-patient-session-change-me"
    patient_session_ttl_seconds: int = 28_800  # 8 hours
    otp_ttl_seconds: int = 300
    otp_simulate: bool = True  # return/log OTP in responses (disable in production)

    # Phase 3 WebSocket alerts — dev shared secrets (comma-separated); disabled in production profile.
    ws_dev_tokens: str = "dev-token-1,dev-token-2"
    ws_allow_dev_tokens: bool = True

    # Tier C pilot: POST /ai/risk-score (rules-based deterioration band; optional ML assist).
    ai_risk_score_enabled: bool = False
    # rules | ml | blend — ml/blend require EHR_AI_ML_MODEL_PATH (joblib + .meta.json).
    ai_risk_score_model: str = "rules"
    ai_ml_model_path: str = ""

    # Clinical AI assessment (LLM-assisted differential diagnosis).
    # Provider: rules | openai | anthropic | azure_openai | google
    # Falls back to rules when provider is unset, unknown, or API call fails.
    clinical_ai_provider: str = "rules"
    clinical_ai_max_input_chars: int = 12_000
    clinical_ai_rate_limit_per_min: int = 20
    clinical_ai_request_timeout_s: float = 45.0

    # OpenAI-compatible (also works with many proxies when base URL is set).
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.openai.com/v1"

    # Anthropic Messages API
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-haiku-latest"

    # Azure OpenAI
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_deployment: str = ""
    azure_openai_api_version: str = "2024-02-15-preview"

    # Google Gemini
    google_api_key: str = ""
    google_model: str = "gemini-1.5-flash"

    # Comma-separated extra CORS origins for facility/public hosts (https://app.example)
    cors_extra_origins: str = ""

    # OTP abuse controls
    otp_rate_limit_per_min: int = 5

    # M-Pesa (Safaricom Daraja) — simulate STK/C2B in pilot when true.
    mpesa_simulate: bool = True
    mpesa_paybill: str = "400100"
    mpesa_account_ref: str = "UniHealth Health"
    mpesa_shortcode: str = ""
    mpesa_consumer_key: str = ""
    mpesa_consumer_secret: str = ""
    mpesa_passkey: str = ""
    mpesa_c2b_passkey: str = ""
    mpesa_callback_base_url: str = ""

    @model_validator(mode="after")
    def _apply_deployment_profile(self) -> "Settings":
        env = (self.deployment_env or "development").strip().lower()
        if env == "production":
            self.consent_mode = "strict"
            self.oidc_allow_header_fallback = False
            self.ws_allow_dev_tokens = False
            self.infra_optional = False
            self.otp_simulate = False
            self.mpesa_simulate = False
            issuer = (self.oidc_issuer_url or "").strip()
            if issuer:
                self.oidc_enabled = True
            else:
                # Session-only facility pilot: never trust role headers.
                self.oidc_enabled = False
                if (self.patient_session_secret or "").strip() in (
                    "",
                    "unihealth-dev-patient-session-change-me",
                ):
                    raise ValueError(
                        "EHR_PATIENT_SESSION_SECRET must be a strong random value "
                        "when production runs without OIDC"
                    )
            if self.oidc_enabled and (self.patient_session_secret or "").strip() == (
                "unihealth-dev-patient-session-change-me"
            ):
                # Still reject default even with OIDC (defense in depth if OIDC later disabled).
                pass
        elif env == "staging":
            self.infra_optional = False
        return self

    @property
    def is_production(self) -> bool:
        return (self.deployment_env or "").strip().lower() == "production"

    def cors_origins_list(self) -> list[str]:
        base = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
        ]
        extra = [o.strip() for o in (self.cors_extra_origins or "").split(",") if o.strip()]
        return base + extra


settings = Settings()
