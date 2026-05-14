"""
UniHealth Phase 3 — Clinical decision-support (v2)
================================================
  1. diagnosis_hints  — expanded rule-based differential patterns
  2. anomaly_check    — hard thresholds + NEWS2 composite + z-score vs series baselines
  3. ews_score        — NEWS2 Early Warning Score wrapper

Deterministic & auditable for KDPA transparency.
"""

from __future__ import annotations

import time
from typing import Any

from app.ai.baselines import MIN_SAMPLES_Z, MIN_STD
from app.ai.simulator import news2

MODEL_VERSION = "rule-v2.1.0"

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
    (
        lambda f: f.get("rr", 14) >= 22 and f.get("sbp", 120) <= 100,
        "Sepsis risk (qSOFA-style screen)", "R65.2", 71,
        "RR ≥22 + SBP ≤100 — with infection suspicion, escalate sepsis bundle + lactate.",
    ),
    (
        lambda f: f.get("sbp", 120) <= 90 and f.get("creatinine", 88) >= 150 and f.get("lactate", 0) >= 1.5,
        "Acute Kidney Injury — hypo-perfusion / shock", "N17.9", 82,
        "Hypotension + elevated creatinine + lactate rise — optimise perfusion.",
    ),
    (
        lambda f: f.get("platelets", 200) <= 120 and f.get("wbc", 8) <= 5.5 and f.get("temp", 37) >= 38.0,
        "DIC syndrome — early consideration", "D65", 74,
        "Thrombocytopenia + leukopenia tendency + fever — consumptive coagulopathy differential.",
    ),
    (
        lambda f: min(f.get("sodium", 140), f.get("na", 140)) <= 126
        and f.get("glasgow", f.get("gcs", 15)) <= 14,
        "Symptomatic hyponatraemia risk", "E87.1", 81,
        "Severe hyponatraemia with reduced GCS — controlled correction pathways.",
    ),
    (
        lambda f: f.get("glucose", 5) <= 3.3 and f.get("hr", 80) >= 90,
        "Hypoglycaemia", "E16.2", 88,
        "Glucose ≤3.3 mmol/L with sympathetic surge — urgent correction + cause search.",
    ),
    (
        lambda f: f.get("alt", 40) >= 280 and max(f.get("bilirubin", 12), f.get("bil", 12)) >= 48,
        "Acute hepatic dysfunction", "K72.0", 79,
        "Marked transaminase + bilirubin rise — toxin / viral / ischaemic hepatitis differential.",
    ),
    (
        lambda f: f.get("inr", 1.0) >= 3.5 and f.get("platelets", 200) <= 115,
        "Coagulopathy with thrombocytopenia", "D68.9", 76,
        "Elevated INR + falling platelets — liver failure vs consumptive process.",
    ),
    (
        lambda f: f.get("bicarb", 24) <= 17 and f.get("spo2", 98) <= 93 and f.get("rr", 18) >= 22,
        "Hypercapnic COPD exacerbation risk", "J44.1", 70,
        "Metabolic alkalosis/compensation discordance + respiratory distress — ABG review.",
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
    ("aspirin",        "ticagrelor",      "HIGH",   "Dual antiplatelet — major bleeding vigilance"),
    ("clarithromycin", "simvastatin",    "HIGH",   "CYP3A4 interaction → rhabdomyolysis risk — stop statin or substitute macrolide"),
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
        "differentials":      differentials[:12],
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
    {"metric": "creatinine","op": "gt", "value": 528, "severity": "CRITICAL", "msg": "Kidney Injury stage 3 concern (absolute Cr) — renal consult"},  # µmol/L
    {"metric": "creatinine","op": "gt", "value": 310, "severity": "HIGH",     "msg": "Marked creatinine rise — compare to baseline, hold nephrotoxins"},
    {"metric": "na",       "op": "lt", "value": 123,  "severity": "CRITICAL", "msg": "Critical hyponatraemia — slow correction, endocrine input"},
    {"metric": "sodium",   "op": "lt", "value": 123,  "severity": "CRITICAL", "msg": "Critical hyponatraemia — slow correction, endocrine input"},
    {"metric": "glucose",  "op": "lt", "value": 2.8,  "severity": "CRITICAL", "msg": "Severe hypoglycaemia — IV dextrose if unconscious/incoherent"},
    {"metric": "wbc",      "op": "gt", "value": 32,   "severity": "HIGH",     "msg": "Extreme leukocytosis — infection vs leukaemic presentation"},
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


def _news2_composite_anomaly(patient_id: str, payload: dict, now_str: str) -> dict | None:
    """Single composite alert from Royal College NEWS2 aggregation."""
    try:
        rr   = int(float(payload.get("rr", 0) or 0))
        spo2 = int(float(payload.get("spo2", 0) or 0))
        sbp  = int(float(payload.get("sbp", 0) or 0))
        hr   = int(float(payload.get("hr", 0) or 0))
        temp = float(payload.get("temp", 37) or 37)
        gcs  = int(float(payload.get("gcs", payload.get("glasgow", 15)) or 15))
    except (TypeError, ValueError):
        return None
    if rr <= 0 or spo2 <= 0 or sbp <= 0 or hr <= 0:
        return None

    nw = news2(rr, spo2, sbp, hr, temp, gcs)
    score = int(nw.get("score", 0))
    if score < 5:
        return None
    sev = "CRITICAL" if score >= 7 or nw.get("any_single_3") else "HIGH"

    return {
        "id":            f"ANO-{patient_id}-NEWS2-{int(time.time() * 1000)}",
        "patient_id":    patient_id,
        "metric":        "NEWS2",
        "value":         float(score),
        "severity":      sev,
        "msg":           f"NEWS2 score {score} ({nw['risk']}) — {nw['action']}",
        "type":          "news2_composite",
        "model_version": MODEL_VERSION,
        "generated_at":  now_str,
        "acknowledged":    False,
        "ews_components": nw.get("components"),
    }


def anomaly_check(patient_id: str, vitals: dict, labs: dict | None = None,
                  baseline: dict | None = None) -> list[dict]:
    """
    Check vitals + labs for anomalies.

    Modes:
      - Absolute critical thresholds (_CRITICAL_THRESHOLDS)
      - Per-metric z-score vs population baseline (requires ≥ MIN_SAMPLES_Z vitals readings)
      - Composite NEWS2-based alert when full vital set supplied
    """
    anomalies: list[dict] = []
    now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    combined: dict = {**vitals}
    if labs:
        combined.update(labs)

    skip_z_for: set[str] = set()
    taken_metrics: set[str] = set()

    for metric, value in combined.items():
        if not isinstance(value, (int, float)):
            continue
        fval = float(value)

        # Hard threshold check
        for thresh in _CRITICAL_THRESHOLDS:
            if _check_threshold(metric, fval, thresh):
                oid = f"ANO-{patient_id}-{metric}-{int(time.time() * 1000)}"
                anomalies.append({
                    "id":            oid,
                    "patient_id":    patient_id,
                    "metric":        metric,
                    "value":         fval,
                    "severity":      thresh["severity"],
                    "msg":           thresh["msg"],
                    "type":          "threshold",
                    "model_version": MODEL_VERSION,
                    "generated_at":  now_str,
                    "acknowledged":  False,
                })
                taken_metrics.add(metric)
                skip_z_for.add(metric)
                break

        # Z-score vs patient-specific baseline (from vital time series)
        if baseline and metric in baseline and metric not in skip_z_for:
            bl = baseline[metric]
            if not isinstance(bl, dict):
                continue
            n = int(bl.get("n", 0))
            if n < MIN_SAMPLES_Z:
                continue
            mean = float(bl.get("mean", 0))
            std = float(bl.get("std", MIN_STD) or MIN_STD)
            std_eff = max(std, MIN_STD)
            z = abs(fval - mean) / std_eff
            if z >= 3.0 and metric not in taken_metrics:
                anomalies.append({
                    "id":            f"ANO-{patient_id}-{metric}-z-{int(time.time() * 1000)}",
                    "patient_id":    patient_id,
                    "metric":        metric,
                    "value":         fval,
                    "z_score":       round(z, 2),
                    "severity":      "HIGH" if z >= 4 else "MEDIUM",
                    "msg": (
                        f"{metric.upper()} deviates {z:.1f}σ vs patient baseline μ={mean}, σ={std_eff}, n={n}"
                    ),
                    "type":          "z_score",
                    "model_version": MODEL_VERSION,
                    "generated_at":  now_str,
                    "acknowledged":  False,
                    "baseline_n":    n,
                })
                taken_metrics.add(metric)

    comp = _news2_composite_anomaly(patient_id, combined, now_str)
    if comp:
        anomalies.append(comp)

    return anomalies


# ══════════════════════════════════════════════════════════════════
# 3. NEWS2 WRAPPER (convenience re-export)
# ══════════════════════════════════════════════════════════════════

def compute_news2(rr: int, spo2: int, sbp: int, hr: int, temp: float, gcs: int = 15) -> dict:
    result = news2(rr, spo2, sbp, hr, temp, gcs)
    result["model_version"] = MODEL_VERSION
    result["generated_at"]  = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return result
