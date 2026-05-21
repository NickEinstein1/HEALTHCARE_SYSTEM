"""Phase 2 production deployment profile."""

from app.config import Settings


def test_production_profile_enforces_strict_oidc() -> None:
    s = Settings(
        _env_file=None,
        deployment_env="production",
        oidc_issuer_url="https://auth.example/realms/unihealth",
        oidc_enabled=False,
        oidc_allow_header_fallback=True,
        consent_mode="permissive",
    )
    assert s.is_production
    assert s.consent_mode == "strict"
    assert s.oidc_allow_header_fallback is False
    assert s.oidc_enabled is True


def test_development_profile_unchanged() -> None:
    s = Settings(_env_file=None, deployment_env="development")
    assert not s.is_production
    assert s.consent_mode == "permissive"
    assert s.oidc_allow_header_fallback is True
