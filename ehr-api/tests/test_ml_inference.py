"""Tier C ML inference helpers."""

from __future__ import annotations

from app.ai.ml_inference import build_feature_vector, ml_model_available, proba_to_band


def test_build_feature_vector_dim() -> None:
    vec = build_feature_vector(
        {"rr": 20, "spo2": 94, "temp": 38.2},
        medication_active_count=2,
        age_band="40_64",
        sex="male",
        encounter_class="IMP",
    )
    assert len(vec) == 11 + 1 + 4 + 3 + 4


def test_proba_to_band() -> None:
    assert proba_to_band(0.7) == "HIGH"
    assert proba_to_band(0.4) == "MEDIUM"
    assert proba_to_band(0.1) == "LOW"


def test_ml_model_available_false_without_path(monkeypatch) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "ai_risk_score_model", "ml", raising=False)
    monkeypatch.setattr(settings, "ai_ml_model_path", "", raising=False)
    assert ml_model_available() is False
