"""Unit tests for FHIR-backed patient AI helpers."""

from __future__ import annotations

from datetime import datetime, timezone

from app.ai.patient_fhir import (
    build_patient_alerts,
    build_patient_insights,
    clinical_features_from_fhir,
    observations_to_vitals_and_labs,
)
from app.models import MedicationRequest, Observation


def _obs(code: str, value: str) -> Observation:
    return Observation(
        id="O1",
        patient_id="P001",
        code=code,
        effective_time=datetime.now(timezone.utc),
        value_text=value,
        unit=None,
    )


def test_observations_parse_bp_and_potassium() -> None:
    obs = [
        _obs("Blood pressure", "145/92"),
        _obs("Potassium", "5.8"),
        _obs("Heart rate", "88"),
    ]
    vitals, labs = observations_to_vitals_and_labs(obs)
    assert vitals["sbp"] == 145.0
    assert labs.get("potassium") == 5.8


def test_build_insights_includes_lab_and_news2() -> None:
    obs = [_obs("Potassium", "5.8"), _obs("SpO2", "96"), _obs("Heart rate", "72")]
    meds = [
        MedicationRequest(
            id="M1",
            patient_id="P001",
            medication_code="Metformin 500mg",
            status="active",
        )
    ]
    insights, news2 = build_patient_insights("P001", obs, meds)
    assert news2.get("score") is not None
    titles = [i["title"] for i in insights]
    assert any("Potassium" in t for t in titles)
    assert any("Vitals" in t or "vitals" in t.lower() for t in titles)


def test_clinical_features_no_vital_defaults() -> None:
    obs = [_obs("Potassium", "6.2")]
    features, meds = clinical_features_from_fhir(obs, [])
    assert features.get("potassium") == 6.2
    assert "temp" not in features
    assert "spo2" not in features
    assert meds == []


def test_clinical_features_includes_crp_and_meds() -> None:
    obs = [_obs("CRP", "85"), _obs("Heart rate", "110")]
    meds = [
        MedicationRequest(
            id="M2",
            patient_id="P001",
            medication_code="Warfarin 5mg",
            status="active",
        )
    ]
    features, names = clinical_features_from_fhir(obs, meds)
    assert features.get("crp") == 85.0
    assert features.get("hr") == 110.0
    assert "Warfarin" in names[0]


def test_build_alerts_flags_critical_potassium() -> None:
    obs = [_obs("Potassium", "6.8")]
    alerts = build_patient_alerts("P001", obs, [], limit=10)
    assert alerts
    assert any("potassium" in a["title"].lower() or "Potassium" in a["title"] for a in alerts)
