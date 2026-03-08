from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    postgres_dsn: str = "postgresql://ehr:ehr_dev_password@localhost:5432/ehr"
    cache_ttl_seconds: int = 300  # 5 min for patient summary
    default_encounters_limit: int = 5
    kafka_bootstrap_servers: str = "localhost:9092"
    # Consent behavior:
    # - permissive: allow reads if no explicit consent record exists (Phase 1 default for pilot)
    # - strict: deny reads unless an active consent exists for (patient, facility, scope)
    consent_mode: str = "permissive"

    class Config:
        env_prefix = "EHR_"


settings = Settings()
