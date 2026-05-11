"""
UniHealth Phase 3 — Rule-Based AI Engine (v1)
=============================================
Provides three clinical decision-support capabilities:

  1. diagnosis_hints  — differential diagnosis from vitals + labs + demographics
  2. anomaly_check    — Z-score + hard-threshold patient deterioration detection
  3. ews_score        — NEWS2 Early Warning Score wrapper

All logic is deterministic, auditable, and KDPA-transparent.
Model version is stamped on every response for audit trail purposes.
"""

from __future__ import annotations

import time
from typing import Any

from app.ai.simulator import news2

MODEL_VERSION = "rule-v1.0.0"
_AUDIT_TTL_SECONDS = 7 * 24 * 3600  # 7 days in-memory retention


# ══════════════════════════════════════════════════════════════════
# 1. DIAGNOSIS HINTS
# ══════════════════════════════════════════════════════════════════

# Each rule: (fn(features) -> bool, diagnosis, icd10, confidence, rationale)
_DX_RULES: list[tuple[Any, str, str, int, str]] = [
    (
        lambda f: f.get("temp", 37) >= 38.0 and f.get("rr", 16) >= 22 and f.get("spo2", 98) <= 94,
        "Community-Acquired Pneumonia", "J18.9", 87,
        "Fever ≥38°C + tachypnoea ≥22 + SpO₂ ≤94% — classic CAP triad.",
    ),
    (
        lambda f: f.get("glucose", 5) >= 20 and f.get("bicarb", 24) <= 12,
        "Diabetic Ketoacidosis", "E10.1", 94,
        "Hyperglycaemia ≥20 mmol/L with acidotic bicarbonate ≤12 — DKA threshold met.",
    ),
    (
        lambda f: f.get("troponin", 0) >= 0.04,
        "Acute Coronary Syndrome", "I24.9", 91,
        "Elevated troponin I ≥0.04 µg/L — myocardial injury marker positive.",
    ),
    (
        lambda f: f.get("lactate", 0) >= 2.0 and f.get("sbp", 120) <= 90 and f.get("temp", 37) >= 38.0,
        "Septic Shock", "A41.9", 96,
        "Lactate ≥2 + hypotension + fever — Sepsis-3 criteria for septic shock.",
    ),
    (
        lambda f: f.get("creatinine", 90) >= 200 and f.get("potassium", 4) >= 6.0,
        "Acute Kidney Injury with Hyperkalaemia", "N17.9", 93,
        "Creatinine ≥200 + K⁺ ≥6.0 — AKI with life-threatening electrolyte disturbance.",
    ),
    (
        lambda f: f.get("sbp", 120) >= 160 and f.get("hr", 80) >= 90 and f.get("temp", 37) >= 38.5 and f.get("rr", 16) >= 20,
        "Hypertensive Urgency / Crisis", "I10", 83,
        "SBP ≥160 + tachycardia + fever + tachypnoea — hypertensive urgency.",
    ),
    (
        lambda f: f.get("sbp", 120) <= 100 and f.get("hr", 80) >= 110 and f.get("spo2", 98) <= 92 and f.get("rr", 16) >= 22,
        "Heart Failure, Decompensated", "I50.9", 85,
        "Hypotension + tachycardia + desaturation + tachypnoea — decompensated cardiac failure.",
    ),
    (
        lambda f: f.get("temp", 37) >= 39.0 and f.get("hr", 80) >= 110,
        "Severe Malaria / Febrile Illness", "B54", 72,
        "High fever ≥39°C + tachycardia — consider malaria (endemic region) and sepsis.",
    ),
    (
        lambda f: f.get("temp", 37) >= 37.5 and f.get("crp", 0) >= 50 and f.get("rr", 16) >= 22,
        "Pulmonary Tuberculosis", "A15.0", 68,
        "Sub-febrile temp + elevated CRP + tachypnoea — TB cannot be excluded.",
    ),
    (
        lambda f: f.get("hb", 14) <= 7.0 and f.get("hr", 80) >= 100,
        "Severe Anaemia", "D64.9", 90,
        "Haemoglobin ≤7 g/dL + compensatory tachycardia — symptomatic severe anaemia.",
    ),
    (
        lambda f: f.get("glucose", 5) >= 7 and f.get("temp", 37) >= 37.5 and f.get("wbc", 8) >= 12,
        "Type 2 Diabetes with Infection", "E11.9", 77,
        "Hyperglycaemia + fever + leukocytosis — uncontrolled DM with infective trigger.",
    ),
    (
        lambda f: f.get("rr", 16) >= 24 and f.get("spo2", 98) <= 92 and f.get("hr", 80) >= 110,
        "Pulmonary Embolism (possible)", "I26.9", 65,
        "Tachypnoea + desaturation + tachycardia — PE on differential, needs CTPA.",
    ),
]

# Drug interaction rule pairs: (drug_a_substring, drug_b_substring, severity, detail)
_DRUG_INTERACTIONS: list[tuple[str, str, str, str]] = [
    ("warfarin",       "aspirin",         "HIGH",   "Additive bleeding risk — dual anticoagulation+antiplatelet"),
    ("metformin",      "contrast",        "HIGH",   "Metformin must be withheld 48h before/after iodinated contrast (lactic acidosis risk)"),
    ("ciprofloxacin",  "metronidazole",   "MEDIUM", "Additive QTc prolongation — ECG monitoring required"),
    ("frusemide",      "gentamicin",      "HIGH",   "Synergistic nephrotoxicity and ototoxicity"),
    ("enalapril",      "potassium",       "MEDIUM", "ACE inhibitor + K⁺ supplement → hyperkalaemia risk"),
    ("carvedilol",     "amlodipine",      "LOW",    "Enhanced antihypertensive effect — monitor BP closely"),
    ("morphine",       "midazolam",       "HIGH",   "Synergistic respiratory depression — reduce doses, monitor SpO₂"),
    ("insulin",        "metformin",       "LOW",    "Combined hypoglycaemia risk — monitor BG 4-hourly"),
]


def diagnosis_hints(features: dict, medications: list[str] | None = None) -> dict:
    """
    Run all clinical rules against extracted features.

    Args:
        features: dict with keys: temp, rr, spo2, sbp, hr, glucose, creatinine,
                  potassium, lactate, troponin, hb, wbc, crp, bicarb
        medications: list of current medication name strings (for interaction check)

    Returns dict with differentials, drug_interactions, model_version, generated_at.
    """
    differentials: list[dict] = []
    for rule_fn, diag, icd, conf, rationale in _DX_RULES:
        try:
            if rule_fn(features):
                differentials.append({
                    "diagnosis":  diag,
                    "icd10":      icd,
                    "confidence": conf,
                    "rationale":  rationale,
                })
        except Exception:
            pass

    differentials.sort(key=lambda d: d["confidence"], reverse=True)

    # Drug interaction check
    interactions: list[dict] = []
    if medications:
        meds_lower = [m.lower() for m in medications]
        for drug_a, drug_b, severity, detail in _DRUG_INTERACTIONS:
            has_a = any(drug_a in m for m in meds_lower)
            has_b = any(drug_b in m for m in meds_lower)
            if has_a and has_b:
                interactions.append({
                    "drug_a":   drug_a.title(),
                    "drug_b":   drug_b.title(),
                    "severity": severity,
                    "detail":   detail,
                })

    return {
        "differentials":      differentials[:8],
        "drug_interactions":  interactions,
        "model_version":      MODEL_VERSION,
        "generated_at":       time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "disclaimer":         "AI hints are decision-support only. Clinical judgement always takes precedence.",
    }


# ══════════════════════════════════════════════════════════════════
# 2. ANOMALY DETECTION
# ══════════════════════════════════════════════════════════════════

# Hard clinical thresholds for critical-value alerting (KDPA-auditable)
_CRITICAL_THRESHOLDS: list[dict] = [
    {"metric": "spo2",      "op": "lt", "value": 88,   "severity": "CRITICAL", "msg": "SpO₂ critically low — immediate respiratory support"},
    {"metric": "spo2",      "op": "lt", "value": 92,   "severity": "HIGH",     "msg": "SpO₂ below safe threshold — increase O₂ delivery"},
    {"metric": "sbp",       "op": "lt", "value": 80,   "severity": "CRITICAL", "msg": "Severe hypotension — fluid resuscitation and vasopressors"},
    {"metric": "sbp",       "op": "gt", "value": 220,  "severity": "CRITICAL", "msg": "Hypertensive emergency — immediate IV antihypertensive"},
    {"metric": "hr",        "op": "gt", "value": 150,  "severity": "CRITICAL", "msg": "Extreme tachycardia — assess for AF, SVT, or haemodynamic instability"},
    {"metric": "hr",        "op": "lt", "value": 35,   "severity": "CRITICAL", "msg": "Severe bradycardia — check for heart block, atropine ready"},
    {"metric": "rr",        "op": "gt", "value": 30,   "severity": "CRITICAL", "msg": "Extreme tachypnoea — consider intubation threshold"},
    {"metric": "temp",      "op": "gt", "value": 40.0, "severity": "CRITICAL", "msg": "Hyperpyrexia ≥40°C — active cooling and sepsis protocol"},
    {"metric": "temp",      "op": "lt", "value": 35.0, "severity": "HIGH",     "msg": "Hypothermia — warming measures and investigate cause"},
    {"metric": "gcs",       "op": "lt", "value": 9,    "severity": "CRITICAL", "msg": "Severely reduced consciousness (GCS<9) — airway at risk"},
    {"metric": "potassium", "op": "gt", "value": 6.5,  "severity": "CRITICAL", "msg": "Life-threatening hyperkalaemia — immediate cardiac monitoring + calcium gluconate"},
    {"metric": "glucose",   "op": "gt", "value": 25.0, "severity": "CRITICAL", "msg": "Severe hyperglycaemia — assess for DKA/HHS"},
    {"metric": "lactate",   "op": "gt", "value": 4.0,  "severity": "CRITICAL", "msg": "Severe lactic acidosis — septic shock until proven otherwise"},
    {"metric": "troponin",  "op": "gt", "value": 0.1,  "severity": "CRITICAL", "msg": "Significant troponin rise — activate ACS pathway"},
]


def _check_threshold(metric: str, value: float, threshold: dict) -> bool:
    if threshold["metric"] != metric:
        return False
    op = threshold["op"]
    tv = threshold["value"]
    if op == "lt":
        return value < tv
    if op == "gt":
        return value > tv
    return False


def anomaly_check(patient_id: str, vitals: dict, labs: dict | None = None,
                  baseline: dict | None = None) -> list[dict]:
    """
    Check vitals + labs for anomalies.

    Returns list of anomaly dicts:
      {patient_id, metric, value, severity, msg, type, z_score?, generated_at}

    Two detection modes:
      - Hard threshold: metric vs absolute clinical limit
      - Z-score (if baseline provided): |value - mean| / std > 3.0 (3-sigma rule)
    """
    anomalies: list[dict] = []
    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    combined: dict = {**vitals}
    if labs:
        combined.update(labs)

    for metric, value in combined.items():
        if not isinstance(value, (int, float)):
            continue
        fval = float(value)

        # Hard threshold check
        for thresh in _CRITICAL_THRESHOLDS:
            if _check_threshold(metric, fval, thresh):
                anomalies.append({
                    "id":           f"ANO-{patient_id}-{metric}-{int(time.time()*1000)}",
                    "patient_id":   patient_id,
                    "metric":       metric,
                    "value":        fval,
                    "severity":     thresh["severity"],
                    "msg":          thresh["msg"],
                    "type":         "threshold",
                    "model_version": MODEL_VERSION,
                    "generated_at": now_str,
                    "acknowledged": False,
                })
                break  # one alert per metric per check

        # Z-score check (patient's own baseline)
        if baseline and metric in baseline:
            bl = baseline[metric]
            std = bl.get("std", 1.0) or 1.0
            z = abs(fval - bl["mean"]) / std
            if z >= 3.0 and not any(a["metric"] == metric for a in anomalies):
                anomalies.append({
                    "id":           f"ANO-{patient_id}-{metric}-z-{int(time.time()*1000)}",
                    "patient_id":   patient_id,
                    "metric":       metric,
                    "value":        fval,
                    "z_score":      round(z, 2),
                    "severity":     "HIGH" if z >= 4 else "MEDIUM",
                    "msg":          f"{metric.upper()} deviates {z:.1f}σ from patient baseline (mean {bl['mean']}, SD {std})",
                    "type":         "z_score",
                    "model_version": MODEL_VERSION,
                    "generated_at": now_str,
                    "acknowledged": False,
                })

    return anomalies


# ══════════════════════════════════════════════════════════════════
# 3. NEWS2 WRAPPER (convenience re-export)
# ══════════════════════════════════════════════════════════════════

def compute_news2(rr: int, spo2: int, sbp: int, hr: int, temp: float, gcs: int = 15) -> dict:
    result = news2(rr, spo2, sbp, hr, temp, gcs)
    result["model_version"] = MODEL_VERSION
    result["generated_at"]  = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return result
