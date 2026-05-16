from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="EHR_")

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


settings = Settings()
