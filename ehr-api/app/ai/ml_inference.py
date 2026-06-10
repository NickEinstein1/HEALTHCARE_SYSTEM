"""
Optional sklearn deterioration model for POST /ai/risk-score (Tier C).

Loads joblib pipeline from EHR_AI_ML_MODEL_PATH when EHR_AI_RISK_SCORE_MODEL=ml|blend.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import settings

NUMERIC_KEYS = (
    "rr",
    "spo2",
    "sbp",
    "hr",
    "temp",
    "gcs",
    "potassium",
    "glucose",
    "creatinine",
    "crp",
    "lactate",
)
AGE_BANDS = ("under_40", "40_64", "65_plus", "unknown")
SEX_VALUES = ("male", "female", "unknown")
ENCOUNTER_CLASSES = ("AMB", "IMP", "EMER", "unknown")


def _one_hot(value: str, categories: tuple[str, ...]) -> list[float]:
    return [1.0 if value == c else 0.0 for c in categories]


def age_band_from_birth_date(birth_date: Any) -> str:
    if birth_date is None:
        return "unknown"
    try:
        from datetime import date

        today = date.today()
        if hasattr(birth_date, "year"):
            years = today.year - birth_date.year
            if (today.month, today.day) < (birth_date.month, birth_date.day):
                years -= 1
        else:
            return "unknown"
        if years < 40:
            return "under_40"
        if years < 65:
            return "40_64"
        return "65_plus"
    except Exception:
        return "unknown"


def build_feature_vector(
    features: dict[str, float],
    *,
    medication_active_count: int = 0,
    age_band: str = "unknown",
    sex: str = "unknown",
    encounter_class: str = "unknown",
) -> list[float]:
    vec = [float(features.get(k, 0.0)) for k in NUMERIC_KEYS]
    vec.append(float(medication_active_count))
    vec.extend(_one_hot(age_band, AGE_BANDS))
    vec.extend(_one_hot(sex, SEX_VALUES))
    vec.extend(_one_hot(encounter_class, ENCOUNTER_CLASSES))
    return vec


def proba_to_band(proba: float) -> str:
    if proba >= 0.6:
        return "HIGH"
    if proba >= 0.35:
        return "MEDIUM"
    return "LOW"


@lru_cache(maxsize=2)
def _load_pipeline(model_path: str):
    import joblib

    path = Path(model_path)
    if not path.is_file():
        raise FileNotFoundError(f"ML model not found: {path}")
    return joblib.load(path)


def ml_model_available() -> bool:
    mode = (settings.ai_risk_score_model or "rules").strip().lower()
    if mode not in ("ml", "blend"):
        return False
    path = (settings.ai_ml_model_path or "").strip()
    if not path:
        return False
    return Path(path).is_file()


def predict_deterioration_proba(
    features: dict[str, float],
    *,
    medication_active_count: int = 0,
    age_band: str = "unknown",
    sex: str = "unknown",
    encounter_class: str = "unknown",
) -> tuple[float, str]:
    """Return (probability, model_version label)."""
    path = (settings.ai_ml_model_path or "").strip()
    if not path:
        raise RuntimeError("EHR_AI_ML_MODEL_PATH not set")
    pipe = _load_pipeline(path)
    import numpy as np

    x = np.array(
        [
            build_feature_vector(
                features,
                medication_active_count=medication_active_count,
                age_band=age_band,
                sex=sex,
                encounter_class=encounter_class,
            )
        ],
        dtype=np.float64,
    )
    proba = float(pipe.predict_proba(x)[0, 1])
    meta_path = Path(path).with_suffix(".meta.json")
    version = "sklearn_logistic_v1"
    if meta_path.is_file():
        try:
            import json

            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            version = str(meta.get("model_type") or version)
        except Exception:
            pass
    return proba, version
