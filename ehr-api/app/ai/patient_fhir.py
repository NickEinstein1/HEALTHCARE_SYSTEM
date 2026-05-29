"""
FHIR-backed patient AI — parse observations + meds for patient-safe insights and alerts.

No ward/census data. Deterministic rules only (KDPA-auditable).
"""

from __future__ import annotations

import re
import time
from typing import Any

from app.ai.models import anomaly_check, compute_news2
from app.models import MedicationRequest, Observation

# Mirrors patient-app VITALS_CATALOG matching
_VITAL_KEYS: list[tuple[str, list[str]]] = [
    ("rr", ["respiratory rate", "resp rate", "rr"]),
    ("spo2", ["spo2", "oxygen saturation", "o2 sat"]),
    ("sbp", ["blood pressure", "bp", "systolic"]),
    ("hr", ["heart rate", "pulse", "hr"]),
    ("temp", ["temperature", "temp", "body temperature"]),
    ("weight", ["weight", "body weight"]),
    ("glucose", ["glucose", "blood glucose", "blood sugar"]),
]

# code substring -> (lo, hi) mmol/L or unit-agnostic numeric bands for pilot
_LAB_RULES: list[dict[str, Any]] = [
    {
        "keys": ["potassium", "k+"],
        "lo": 3.5,
        "hi": 5.1,
        "title": "Potassium result needs follow-up",
        "body_hi": "Your latest potassium is above the usual range. Discuss at your next visit or contact your care team if you feel unwell.",
        "route": "results",
    },
    {
        "keys": ["ldl", "cholesterol"],
        "lo": 0,
        "hi": 3.0,
        "title": "Cholesterol review recommended",
        "body_hi": "LDL is above target for many adults. Your clinician may adjust diet or medication.",
        "route": "results",
    },
    {
        "keys": ["glucose", "blood glucose"],
        "lo": 3.9,
        "hi": 7.8,
        "title": "Blood glucose above usual range",
        "body_hi": "Fasting or random glucose is elevated. Monitor and follow your care plan.",
        "route": "results",
    },
    {
        "keys": ["creatinine"],
        "lo": 60,
        "hi": 120,
        "title": "Kidney function marker elevated",
        "body_hi": "Creatinine is higher than reference. Your care team may repeat the test or review medications.",
        "route": "results",
    },
]


def _code(o: Observation) -> str:
    return (o.code or "").lower()


def _parse_number(text: str | None) -> float | None:
    if not text:
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", str(text).replace(",", ""))
    if not m:
        return None
    try:
        return float(m.group(0))
    except ValueError:
        return None


_EXTRA_LAB_KEYS: list[tuple[str, list[str]]] = [
    ("crp", ["crp", "c-reactive"]),
    ("bicarb", ["bicarb", "bicarbonate", "hco3"]),
    ("troponin", ["troponin"]),
    ("lactate", ["lactate", "lactic"]),
    ("wbc", ["wbc", "white blood", "leukocyte"]),
    ("hb", ["hemoglobin", "haemoglobin"]),
    ("inr", ["inr", "prothrombin"]),
    ("platelets", ["platelet"]),
    ("sodium", ["sodium"]),
    ("na", [" sodium", "na+", "na "]),
    ("alt", ["alt", "alanine aminotransferase"]),
    ("bilirubin", ["bilirubin"]),
    ("glasgow", ["glasgow", "gcs"]),
]


def _assign_lab(labs: dict[str, float], key: str, val: float) -> None:
    if key in ("k", "k+"):
        labs["potassium"] = val
        return
    if key == "hemoglobin":
        labs["hb"] = val
    labs[key] = val


def observations_to_vitals_and_labs(
    observations: list[Observation],
    *,
    apply_defaults: bool = True,
) -> tuple[dict[str, float], dict[str, float]]:
    """Map FHIR observations to vitals + lab numeric features for anomaly engine."""
    vitals: dict[str, float] = {}
    labs: dict[str, float] = {}

    for o in observations:
        code = _code(o)
        val = _parse_number(o.value_text)
        if val is None:
            continue

        matched = False
        for key, patterns in _VITAL_KEYS:
            if any(p in code for p in patterns):
                if key == "sbp" and "/" in (o.value_text or ""):
                    parts = re.findall(r"\d+(?:\.\d+)?", o.value_text or "")
                    if parts:
                        vitals["sbp"] = float(parts[0])
                        if len(parts) > 1:
                            vitals["dbp"] = float(parts[1])
                else:
                    vitals[key] = val
                matched = True
                break
        if matched:
            continue

        for name in (
            "potassium", "k+", "glucose", "creatinine", "lactate", "troponin",
            "sodium", "wbc", "hb", "hemoglobin", "inr", "platelets",
        ):
            if name in code:
                _assign_lab(labs, name, val)
                matched = True
                break
        if matched:
            continue

        for key, patterns in _EXTRA_LAB_KEYS:
            if any(p in code for p in patterns):
                if key == "glasgow":
                    vitals["gcs"] = val
                else:
                    _assign_lab(labs, key, val)
                break

    if apply_defaults:
        vitals.setdefault("gcs", 15.0)
        vitals.setdefault("rr", 16.0)
        vitals.setdefault("spo2", 98.0)
        vitals.setdefault("sbp", 120.0)
        vitals.setdefault("hr", 75.0)
        vitals.setdefault("temp", 37.0)
    elif "gcs" not in vitals:
        vitals.setdefault("gcs", 15.0)

    return vitals, labs


def medication_names_from_requests(medications: list[MedicationRequest]) -> list[str]:
    names: list[str] = []
    for m in medications:
        code = (m.medication_code or "").strip()
        if code:
            names.append(code)
    return names


def clinical_features_from_fhir(
    observations: list[Observation],
    medications: list[MedicationRequest],
) -> tuple[dict[str, float], list[str]]:
    """
  Staff diagnosis-hints feature map from FHIR observations + meds.
  Does not apply normal-range defaults (only parsed values).
    """
    vitals, labs = observations_to_vitals_and_labs(observations, apply_defaults=False)
    features: dict[str, float] = {**vitals, **labs}
    if "glasgow" in features and "gcs" not in features:
        features["gcs"] = features.pop("glasgow")
    return features, medication_names_from_requests(medications)


def merge_clinical_features(
    base: dict[str, float],
    override: dict | None,
) -> dict[str, float]:
    """Payload features override FHIR-derived values."""
    out = dict(base)
    if not override:
        return out
    for k, v in override.items():
        if v is None:
            continue
        try:
            out[k] = float(v)
        except (TypeError, ValueError):
            continue
    return out


def _merge_vitals(base: dict[str, float], override: dict | None) -> dict[str, float]:
    out = dict(base)
    if not override:
        return out
    for k, v in override.items():
        if v is None:
            continue
        try:
            out[k] = float(v)
        except (TypeError, ValueError):
            continue
    return out


def _news2_insight(news2: dict) -> dict:
    risk = str(news2.get("risk", "LOW")).upper()
    if risk == "HIGH":
        return {
            "icon": "⚠️",
            "title": "Vitals suggest higher clinical risk",
            "body": news2.get("action", "Contact your care team or attend urgent care if you feel worse."),
            "tag": "ACTION",
            "tone": "red",
            "route": "vitals",
        }
    if risk == "MEDIUM":
        return {
            "icon": "🟠",
            "title": "Vitals need closer monitoring",
            "body": news2.get("action", "Follow your care plan and message your team if symptoms worsen."),
            "tag": "MONITOR",
            "tone": "amber",
            "route": "vitals",
        }
    if risk in ("LOW+", "LOWPLUS", "LOW PLUS"):
        return {
            "icon": "💡",
            "title": "Vitals stable with minor watch items",
            "body": news2.get("action", "Keep routine monitoring and upcoming appointments."),
            "tag": "MONITOR",
            "tone": "blue",
            "route": "vitals",
        }
    return {
        "icon": "✅",
        "title": "Vitals look stable",
        "body": news2.get("action", "Continue routine monitoring."),
        "tag": "PREVENTIVE",
        "tone": "blue",
        "route": "vitals",
    }


def _lab_insights_from_observations(observations: list[Observation]) -> list[dict]:
    out: list[dict] = []
    for o in observations:
        code = _code(o)
        val = _parse_number(o.value_text)
        if val is None:
            continue
        for rule in _LAB_RULES:
            if not any(k in code for k in rule["keys"]):
                continue
            if val > float(rule["hi"]):
                out.append(
                    {
                        "icon": "🧪",
                        "title": rule["title"],
                        "body": rule["body_hi"],
                        "tag": "ACTION",
                        "tone": "red",
                        "route": rule["route"],
                    }
                )
                break
    return out


def _med_insight(meds: list[MedicationRequest]) -> dict | None:
    active = [m for m in meds if (m.status or "active").lower() in ("active", "on-hold", "unknown", "")]
    if not active:
        return None
    names = ", ".join((m.medication_code or "Medication")[:40] for m in active[:2])
    extra = f" ({len(active)} active)" if len(active) > 2 else ""
    return {
        "icon": "💊",
        "title": "Active prescriptions on your record",
        "body": f"{names}{extra}. Request refills from Medications or at your facility pharmacy.",
        "tag": "REMINDER",
        "tone": "amber",
        "route": "medications",
    }


def build_patient_insights(
    patient_id: str,
    observations: list[Observation],
    medications: list[MedicationRequest],
    vitals_override: dict | None = None,
) -> tuple[list[dict], dict]:
    """Returns (insight_cards, news2_dict)."""
    vitals, labs = observations_to_vitals_and_labs(observations)
    vitals = _merge_vitals(vitals, vitals_override)

    news2 = compute_news2(
        rr=int(vitals.get("rr", 16)),
        spo2=int(vitals.get("spo2", 98)),
        sbp=int(vitals.get("sbp", 120)),
        hr=int(vitals.get("hr", 75)),
        temp=float(vitals.get("temp", 37.0)),
        gcs=int(vitals.get("gcs", 15)),
    )

    insights: list[dict] = []
    insights.append(_news2_insight(news2))
    insights.extend(_lab_insights_from_observations(observations))
    med = _med_insight(medications)
    if med:
        insights.append(med)

    if len(insights) == 1:
        insights.append(
            {
                "icon": "💡",
                "title": "Preventive care reminder",
                "body": "Book routine follow-up and keep your contact details up to date in My Profile.",
                "tag": "PREVENTIVE",
                "tone": "blue",
                "route": "appointments",
            }
        )

    return insights[:6], news2


def _severity_tone(sev: str) -> str:
    s = (sev or "").upper()
    if s == "CRITICAL":
        return "red"
    if s in ("HIGH", "WARNING"):
        return "amber"
    return "blue"


def _route_for_metric(metric: str) -> str:
    m = (metric or "").lower()
    if m in ("news2",):
        return "vitals"
    if m in (
        "potassium", "glucose", "creatinine", "ldl", "troponin", "lactate",
        "sodium", "na", "wbc", "hb",
    ):
        return "results"
    if m in ("spo2", "rr", "hr", "temp", "sbp", "dbp"):
        return "vitals"
    return "vitals"


def _anomaly_to_patient_card(a: dict) -> dict:
    metric = str(a.get("metric", ""))
    sev = str(a.get("severity", "HIGH"))
    msg = str(a.get("msg") or "Clinical finding needs review.")
    title = f"{metric.upper()} — attention needed" if metric else "Health alert"
    return {
        "id": str(a.get("id") or f"alert-{int(time.time() * 1000)}"),
        "icon": "🚨" if sev in ("CRITICAL", "HIGH") else "🔔",
        "title": title,
        "body": _patient_safe_message(msg),
        "tag": sev or "ALERT",
        "tone": _severity_tone(sev),
        "route": _route_for_metric(metric),
        "ts": a.get("generated_at"),
    }


def _patient_safe_message(clinical_msg: str) -> str:
    """Rephrase clinician-facing text for patient portal."""
    replacements = [
        ("intubation", "urgent hospital care"),
        ("vasopressors", "urgent hospital care"),
        ("fluid resuscitation", "urgent medical review"),
        ("ward review", "contact your care team"),
        ("ICU", "hospital specialist care"),
        ("HDU", "hospital specialist care"),
    ]
    out = clinical_msg
    for a, b in replacements:
        out = out.replace(a, b)
    return out


def build_patient_alerts(
    patient_id: str,
    observations: list[Observation],
    stored_anomalies: list[dict],
    limit: int = 10,
) -> list[dict]:
    """FHIR-driven alerts + any stored anomalies for this patient_id."""
    vitals, labs = observations_to_vitals_and_labs(observations)
    live = anomaly_check(patient_id, vitals, labs, baseline=None)

    cards: list[dict] = []
    seen: set[str] = set()

    def add(card: dict) -> None:
        key = card.get("id") or card.get("title", "")
        if key in seen:
            return
        seen.add(key)
        cards.append(card)

    for a in live:
        add(_anomaly_to_patient_card(a))

    for a in stored_anomalies:
        if str(a.get("patient_id", "")).strip() != patient_id:
            continue
        add(_anomaly_to_patient_card(a))

    for li in _lab_insights_from_observations(observations):
        add(
            {
                "id": f"lab-{patient_id}-{li['title'][:24]}",
                "icon": li["icon"],
                "title": li["title"],
                "body": li["body"],
                "tag": li["tag"],
                "tone": li["tone"],
                "route": li.get("route", "results"),
                "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
        )

    order = {"CRITICAL": 0, "HIGH": 1, "WARNING": 2, "MEDIUM": 3, "LOW": 4}
    cards.sort(key=lambda c: order.get(str(c.get("tag", "LOW")).upper(), 9))

    return cards[:limit]
