"""
Deterioration risk score — rules pilot with optional Tier C sklearn assist.
"""

from __future__ import annotations

from typing import Any

from app.ai.ml_inference import (
    age_band_from_birth_date,
    ml_model_available,
    predict_deterioration_proba,
    proba_to_band,
)
from app.ai.models import MODEL_VERSION, anomaly_check, compute_news2
from app.ai.patient_fhir import clinical_features_from_fhir, merge_clinical_features
from app.config import settings
from app.models import MedicationRequest, Observation


def _band_from_news2(score: int, risk_label: str) -> str:
    if score >= 7 or risk_label.upper() == "HIGH":
        return "HIGH"
    if score >= 5 or risk_label.upper() in ("MEDIUM", "LOW+", "LOWPLUS"):
        return "MEDIUM"
    return "LOW"


def _merge_bands(rules_band: str, ml_band: str) -> str:
    order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
    return rules_band if order.get(rules_band, 0) >= order.get(ml_band, 0) else ml_band


def compute_deterioration_risk(
    patient_id: str,
    observations: list[Observation],
    medications: list[MedicationRequest],
    features_override: dict | None = None,
    *,
    patient_gender: str | None = None,
    patient_birth_date: Any = None,
    encounter_class: str = "unknown",
) -> dict:
    fhir_features, _meds = clinical_features_from_fhir(observations, medications)
    features = merge_clinical_features(fhir_features, features_override)

    vitals = {k: features[k] for k in ("rr", "spo2", "sbp", "hr", "temp", "gcs") if k in features}
    labs = {k: v for k, v in features.items() if k not in vitals}

    news2 = compute_news2(
        rr=int(vitals.get("rr", 16)),
        spo2=int(vitals.get("spo2", 98)),
        sbp=int(vitals.get("sbp", 120)),
        hr=int(vitals.get("hr", 75)),
        temp=float(vitals.get("temp", 37.0)),
        gcs=int(vitals.get("gcs", 15)),
    )

    anomalies = anomaly_check(patient_id, vitals, labs or None, baseline=None)
    critical = sum(1 for a in anomalies if str(a.get("severity", "")).upper() == "CRITICAL")
    high = sum(1 for a in anomalies if str(a.get("severity", "")).upper() == "HIGH")

    rules_band = _band_from_news2(int(news2.get("score", 0)), str(news2.get("risk", "LOW")))
    if critical > 0:
        rules_band = "HIGH"
    elif high > 0 and rules_band == "LOW":
        rules_band = "MEDIUM"

    drivers: list[str] = []
    if int(news2.get("score", 0)) >= 5:
        drivers.append(f"NEWS2 {news2.get('score')} ({news2.get('risk')})")
    if critical or high:
        drivers.append(f"{critical + high} active clinical alert(s) from vitals/labs")

    mode = (settings.ai_risk_score_model or "rules").strip().lower()
    band = rules_band
    model_type = "rules-pilot-v1"
    model_version = MODEL_VERSION
    ml_probability: float | None = None
    ml_error: str | None = None

    if mode in ("ml", "blend") and ml_model_available():
        try:
            active_meds = sum(1 for m in medications if (m.status or "").lower() == "active")
            proba, ml_ver = predict_deterioration_proba(
                features,
                medication_active_count=active_meds,
                age_band=age_band_from_birth_date(patient_birth_date),
                sex=(patient_gender or "unknown").lower(),
                encounter_class=(encounter_class or "unknown").upper()[:4] or "unknown",
            )
            ml_probability = proba
            ml_band = proba_to_band(proba)
            model_type = ml_ver
            model_version = ml_ver
            if mode == "ml":
                band = ml_band
                drivers.insert(0, f"ML deterioration probability {proba:.0%} → {ml_band}")
            else:
                band = _merge_bands(rules_band, ml_band)
                drivers.append(f"ML assist probability {proba:.0%} (blend with rules)")
        except Exception as e:
            ml_error = str(e)
            drivers.append(f"ML model unavailable ({e}); rules band only")

    if not drivers:
        drivers.append("No rule-based deterioration signals in latest FHIR snapshot")

    disclaimer = (
        "Rules-based CDS pilot — not diagnostic AI. "
        "ML outputs are experimental until clinical sign-off."
        if ml_probability is not None
        else "Pilot rules-based risk band only — not a validated ML probability. Clinical judgement required."
    )

    out: dict[str, Any] = {
        "patient_id": patient_id,
        "risk_band": band,
        "rules_band": rules_band,
        "model_type": model_type,
        "model_version": model_version,
        "news2": news2,
        "active_alerts": len(anomalies),
        "drivers": drivers,
        "disclaimer": disclaimer,
    }
    if ml_probability is not None:
        out["ml_probability"] = round(ml_probability, 4)
    if ml_error:
        out["ml_error"] = ml_error
    return out
