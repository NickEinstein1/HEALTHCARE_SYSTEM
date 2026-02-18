from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    postgres_dsn: str = "postgresql://ehr:ehr_dev_password@localhost:5432/ehr"
    cache_ttl_seconds: int = 300  # 5 min for patient summary
    default_encounters_limit: int = 5

    class Config:
        env_prefix = "EHR_"


settings = Settings()
