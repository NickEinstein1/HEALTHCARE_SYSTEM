"""
UniHealth Phase 3 — Clinical Data Simulator
============================================
Generates realistic in-memory patient records, vital-sign time series,
lab results, ward occupancy, and 48-hour bed-demand forecasts.

All data is synthetic and de-identified by design (KDPA s.25).
No real patient information is used or inferred.
"""

import math
import random
import time
from typing import Any

# ── deterministic seed for reproducible test runs ──────────────────────
_RNG = random.Random(42)


# ── helper: Kenyan full names (synthetic) ──────────────────────────────
_MALE_FIRST = [
    "James", "John", "David", "Peter", "Samuel", "Joseph", "Daniel", "Paul",
    "Michael", "George", "Francis", "Charles", "Robert", "Edward", "Thomas",
    "Patrick", "Emmanuel", "Collins", "Brian", "Kevin",
]
_FEMALE_FIRST = [
    "Grace", "Faith", "Mary", "Rose", "Esther", "Ruth", "Agnes", "Beatrice",
    "Christine", "Diana", "Eunice", "Florence", "Hannah", "Irene", "Jane",
    "Leah", "Margaret", "Nancy", "Priscilla", "Susan",
]
_SURNAMES = [
    "Kamau", "Njoroge", "Waweru", "Mwangi", "Kimani", "Otieno", "Odhiambo",
    "Omondi", "Achieng", "Adhiambo", "Mutua", "Munyao", "Muthomi", "Gitonga",
    "Mureithi", "Ndegwa", "Kariuki", "Ngugi", "Kiprotich", "Chebet",
]


def _name(gender: str) -> str:
    pool = _MALE_FIRST if gender == "male" else _FEMALE_FIRST
    return f"{_RNG.choice(pool)} {_RNG.choice(_SURNAMES)}"


# ── ward definitions ───────────────────────────────────────────────────
WARDS: list[dict] = [
    {"id": "WARD-A", "name": "General Medicine", "capacity": 20, "facility": "KNH Nairobi"},
    {"id": "WARD-B", "name": "Surgical",          "capacity": 18, "facility": "KNH Nairobi"},
    {"id": "WARD-C", "name": "Maternity",          "capacity": 16, "facility": "KNH Nairobi"},
    {"id": "WARD-D", "name": "Paediatrics",        "capacity": 14, "facility": "KNH Nairobi"},
    {"id": "WARD-E", "name": "ICU / HDU",          "capacity": 8,  "facility": "KNH Nairobi"},
    {"id": "WARD-F", "name": "Orthopaedics",       "capacity": 12, "facility": "KNH Nairobi"},
]

# ── common diagnoses with ICD-10 codes ─────────────────────────────────
DIAGNOSES = [
    ("Community-Acquired Pneumonia",     "J18.9"),
    ("Urinary Tract Infection",          "N39.0"),
    ("Acute Kidney Injury",              "N17.9"),
    ("Type 2 Diabetes Mellitus",         "E11.9"),
    ("Hypertensive Crisis",              "I10"),
    ("Heart Failure",                    "I50.9"),
    ("Acute Appendicitis",               "K35.8"),
    ("Malaria, Unspecified",             "B54"),
    ("Pulmonary Tuberculosis",           "A15.0"),
    ("Severe Anaemia",                   "D64.9"),
    ("Diabetic Ketoacidosis",            "E10.1"),
    ("Acute Coronary Syndrome",          "I24.9"),
    ("Sepsis",                           "A41.9"),
    ("Pre-eclampsia, Severe",            "O14.1"),
    ("Sickle Cell Crisis",               "D57.0"),
]

# ── medication lists by diagnosis ──────────────────────────────────────
_MEDS: dict[str, list[str]] = {
    "J18.9":  ["Amoxicillin-Clavulanate 1.2g IV", "Oxygen 2–4L/min", "Ceftriaxone 1g IV"],
    "N39.0":  ["Ciprofloxacin 500mg PO BD", "IV fluids 0.9% NaCl"],
    "N17.9":  ["IV fluids", "Sodium bicarbonate", "Frusemide 40mg IV"],
    "E11.9":  ["Metformin 500mg BD", "Insulin Actrapid SC"],
    "I10":    ["Amlodipine 10mg OD", "Enalapril 10mg BD", "Labetalol IV"],
    "I50.9":  ["Frusemide 80mg IV", "Carvedilol 6.25mg BD", "Enalapril"],
    "K35.8":  ["IV fluids", "Ceftriaxone 1g IV", "Metronidazole 500mg IV"],
    "B54":    ["Artesunate IV", "Quinine", "IV fluids"],
    "A15.0":  ["Rifampicin", "Isoniazid", "Pyrazinamide", "Ethambutol"],
    "D64.9":  ["IV iron sucrose", "Folic acid", "Blood transfusion PRN"],
    "E10.1":  ["Insulin infusion", "IV fluids 0.9%", "Potassium replacement"],
    "I24.9":  ["Aspirin 300mg", "Atorvastatin 80mg", "GTN SL PRN"],
    "A41.9":  ["Piperacillin-Tazobactam 4.5g IV", "Meropenem", "IV fluids"],
    "O14.1":  ["Magnesium sulphate IV", "Labetalol IV", "Betamethasone IM"],
    "D57.0":  ["Morphine PRN", "IV fluids", "Folic acid", "Oxygen"],
}


def _meds_for(icd: str) -> list[str]:
    return _MEDS.get(icd, ["IV fluids 0.9% NaCl", "Paracetamol 1g QDS"])


# ── vital-sign baseline distributions (mean, std) per diagnosis ────────
# Format: {icd: {metric: (mean, std)}}
_VITAL_BASELINE: dict[str, dict[str, tuple[float, float]]] = {
    "J18.9":  {"rr": (26, 4),  "spo2": (91, 3),  "sbp": (105, 12), "hr": (108, 14), "temp": (38.6, 0.5)},
    "N39.0":  {"rr": (18, 3),  "spo2": (97, 2),  "sbp": (118, 10), "hr": (96, 10),  "temp": (38.1, 0.6)},
    "N17.9":  {"rr": (20, 4),  "spo2": (96, 2),  "sbp": (95, 15),  "hr": (102, 12), "temp": (37.4, 0.5)},
    "E11.9":  {"rr": (18, 3),  "spo2": (97, 2),  "sbp": (140, 14), "hr": (82, 10),  "temp": (37.1, 0.4)},
    "I10":    {"rr": (18, 3),  "spo2": (97, 2),  "sbp": (178, 16), "hr": (88, 10),  "temp": (37.0, 0.3)},
    "I50.9":  {"rr": (24, 5),  "spo2": (90, 4),  "sbp": (98, 12),  "hr": (110, 14), "temp": (37.2, 0.4)},
    "K35.8":  {"rr": (22, 4),  "spo2": (97, 2),  "sbp": (108, 12), "hr": (112, 14), "temp": (38.8, 0.6)},
    "B54":    {"rr": (22, 4),  "spo2": (95, 3),  "sbp": (100, 12), "hr": (118, 14), "temp": (39.4, 0.8)},
    "A15.0":  {"rr": (24, 5),  "spo2": (92, 3),  "sbp": (102, 12), "hr": (104, 12), "temp": (38.3, 0.6)},
    "D64.9":  {"rr": (22, 4),  "spo2": (92, 3),  "sbp": (96, 12),  "hr": (108, 12), "temp": (37.2, 0.4)},
    "E10.1":  {"rr": (26, 5),  "spo2": (96, 2),  "sbp": (92, 14),  "hr": (118, 14), "temp": (37.0, 0.4)},
    "I24.9":  {"rr": (20, 4),  "spo2": (95, 3),  "sbp": (95, 18),  "hr": (108, 16), "temp": (37.3, 0.4)},
    "A41.9":  {"rr": (28, 6),  "spo2": (88, 5),  "sbp": (84, 18),  "hr": (124, 18), "temp": (39.6, 0.8)},
    "O14.1":  {"rr": (20, 4),  "spo2": (97, 2),  "sbp": (162, 16), "hr": (96, 10),  "temp": (37.2, 0.4)},
    "D57.0":  {"rr": (22, 4),  "spo2": (93, 3),  "sbp": (96, 12),  "hr": (114, 14), "temp": (38.0, 0.5)},
}

_DEFAULT_VB: dict[str, tuple[float, float]] = {
    "rr": (18, 3), "spo2": (97, 2), "sbp": (118, 12), "hr": (82, 10), "temp": (37.0, 0.4),
}


def _gauss(mean: float, std: float, lo: float, hi: float, rng: random.Random) -> float:
    return round(max(lo, min(hi, rng.gauss(mean, std))), 1)


def _vitals_reading(
    icd: str,
    ts: float,
    rng: random.Random,
    deteriorate: bool = False,
    deteriorate_factor: float = 1.0,
) -> dict:
    vb = _VITAL_BASELINE.get(icd, _DEFAULT_VB)
    df = deteriorate_factor if deteriorate else 1.0

    def _rr():
        return _gauss(vb["rr"][0] * df, vb["rr"][1], 8, 45, rng)

    def _spo2():
        return _gauss(vb["spo2"][0] / df, vb["spo2"][1], 70, 100, rng)

    def _sbp():
        # deterioration can be high or low BP — use icd prefix to decide
        if icd in ("I10", "O14.1"):
            return _gauss(vb["sbp"][0] * df, vb["sbp"][1], 60, 240, rng)
        else:
            return _gauss(vb["sbp"][0] / df, vb["sbp"][1], 60, 220, rng)

    def _hr():
        return _gauss(vb["hr"][0] * df, vb["hr"][1], 30, 180, rng)

    def _temp():
        return _gauss(vb["temp"][0] + (0.2 if deteriorate else 0), vb["temp"][1], 34.0, 42.0, rng)

    return {
        "ts": time.strftime("%Y-%m-%d %H:%M", time.localtime(ts)),
        "rr":   int(_rr()),
        "spo2": int(_spo2()),
        "sbp":  int(_sbp()),
        "dbp":  int(_gauss(70, 8, 40, 130, rng)),
        "hr":   int(_hr()),
        "temp": _temp(),
        "gcs":  15 if not deteriorate else max(10, int(rng.gauss(13, 2))),
    }


# ── lab result thresholds ─────────────────────────────────────────────
_LAB_PANELS: dict[str, list[dict]] = {
    "J18.9": [
        {"test": "WBC",        "value": 16.4, "unit": "×10⁹/L", "ref": "4–11",    "flag": "HIGH"},
        {"test": "CRP",        "value": 142,  "unit": "mg/L",    "ref": "<10",     "flag": "HIGH"},
        {"test": "Procalcitonin","value": 2.8, "unit": "ng/mL",  "ref": "<0.5",    "flag": "HIGH"},
    ],
    "N17.9": [
        {"test": "Creatinine", "value": 342,  "unit": "µmol/L",  "ref": "60–110",  "flag": "HIGH"},
        {"test": "Potassium",  "value": 6.8,  "unit": "mmol/L",  "ref": "3.5–5.0", "flag": "CRITICAL"},
        {"test": "Urea",       "value": 22,   "unit": "mmol/L",  "ref": "2.5–7.5", "flag": "HIGH"},
    ],
    "E10.1": [
        {"test": "Glucose",    "value": 28.6, "unit": "mmol/L",  "ref": "4–6",     "flag": "CRITICAL"},
        {"test": "Bicarbonate","value": 8,    "unit": "mmol/L",  "ref": "22–29",   "flag": "CRITICAL"},
        {"test": "Ketones",    "value": 4.2,  "unit": "mmol/L",  "ref": "<0.6",    "flag": "HIGH"},
    ],
    "A41.9": [
        {"test": "WBC",        "value": 22.1, "unit": "×10⁹/L", "ref": "4–11",    "flag": "HIGH"},
        {"test": "Lactate",    "value": 4.8,  "unit": "mmol/L",  "ref": "<2",      "flag": "CRITICAL"},
        {"test": "CRP",        "value": 298,  "unit": "mg/L",    "ref": "<10",     "flag": "HIGH"},
    ],
    "I24.9": [
        {"test": "Troponin I", "value": 1.84, "unit": "µg/L",    "ref": "<0.04",   "flag": "CRITICAL"},
        {"test": "CK-MB",      "value": 48,   "unit": "U/L",     "ref": "<25",     "flag": "HIGH"},
    ],
}

_DEFAULT_LABS: list[dict] = [
    {"test": "Haemoglobin", "value": 11.2, "unit": "g/dL",  "ref": "11.5–16.5", "flag": "N"},
    {"test": "WBC",         "value": 8.6,  "unit": "×10⁹/L","ref": "4–11",      "flag": "N"},
    {"test": "Sodium",      "value": 138,  "unit": "mmol/L", "ref": "135–145",   "flag": "N"},
    {"test": "Potassium",   "value": 4.1,  "unit": "mmol/L", "ref": "3.5–5.0",   "flag": "N"},
    {"test": "Creatinine",  "value": 88,   "unit": "µmol/L", "ref": "60–110",    "flag": "N"},
]


def _labs_for(icd: str) -> list[dict]:
    return _LAB_PANELS.get(icd, _DEFAULT_LABS)


# ── build simulated patient pool ───────────────────────────────────────
def build_simulated_patients(n: int = 25) -> list[dict]:
    patients: list[dict] = []
    ward_ids = [w["id"] for w in WARDS]

    for i in range(n):
        gender = _RNG.choice(["male", "female"])
        age = _RNG.randint(18, 82)
        icd, diag = _RNG.choice(DIAGNOSES)
        ward = _RNG.choice(ward_ids)
        deteriorating = _RNG.random() < 0.25  # 25% are deteriorating
        p: dict[str, Any] = {
            "sim_id":       f"SIM-{i+1:03d}",
            "name":         _name(gender),
            "age":          age,
            "gender":       gender,
            "ward_id":      ward,
            "bed":          f"{_RNG.randint(1, 20):02d}",
            "diagnosis":    diag,
            "icd10":        icd,
            "medications":  _meds_for(icd),
            "allergies":    _RNG.choice(["NKDA", "Penicillin", "Sulfonamides", "NKDA", "NKDA"]),
            "deteriorating": deteriorating,
            "admitted_at":  time.strftime(
                "%Y-%m-%d %H:%M",
                time.localtime(time.time() - _RNG.randint(3600, 72 * 3600)),
            ),
        }
        patients.append(p)
    return patients


# ── build vital-sign time series ───────────────────────────────────────
def build_vitals_series(patients: list[dict], hours: int = 48) -> dict[str, list[dict]]:
    """Returns {sim_id: [vitals_reading, ...]} every 4 hours."""
    now = time.time()
    series: dict[str, list[dict]] = {}
    for p in patients:
        readings: list[dict] = []
        n_readings = hours // 4
        for j in range(n_readings):
            ts = now - (n_readings - j) * 4 * 3600
            deteriorate = p["deteriorating"] and j >= n_readings // 2
            df = 1.0 + (0.15 * ((j - n_readings // 2) / max(1, n_readings // 2))) if deteriorate else 1.0
            reading = _vitals_reading(p["icd10"], ts, _RNG, deteriorate, df)
            reading["patient_sim_id"] = p["sim_id"]
            readings.append(reading)
        series[p["sim_id"]] = readings
    return series


# ── compute NEWS2 score ────────────────────────────────────────────────
def news2(rr: int, spo2: int, sbp: int, hr: int, temp: float, gcs: int = 15) -> dict:
    """
    National Early Warning Score 2 (Royal College of Physicians, 2017).
    Returns {"score": int, "risk": str, "components": dict}.
    """
    scores: dict[str, int] = {}

    # Respiratory rate
    if rr <= 8:          scores["rr"] = 3
    elif rr <= 11:       scores["rr"] = 1
    elif rr <= 20:       scores["rr"] = 0
    elif rr <= 24:       scores["rr"] = 2
    else:                scores["rr"] = 3

    # SpO2 (Scale 1 — non-hypercapnic)
    if spo2 <= 91:       scores["spo2"] = 3
    elif spo2 <= 93:     scores["spo2"] = 2
    elif spo2 <= 95:     scores["spo2"] = 1
    else:                scores["spo2"] = 0

    # Systolic BP
    if sbp <= 90:        scores["sbp"] = 3
    elif sbp <= 100:     scores["sbp"] = 2
    elif sbp <= 110:     scores["sbp"] = 1
    elif sbp <= 219:     scores["sbp"] = 0
    else:                scores["sbp"] = 3

    # Heart rate
    if hr <= 40:         scores["hr"] = 3
    elif hr <= 50:       scores["hr"] = 1
    elif hr <= 90:       scores["hr"] = 0
    elif hr <= 110:      scores["hr"] = 1
    elif hr <= 130:      scores["hr"] = 2
    else:                scores["hr"] = 3

    # Temperature
    if temp <= 35.0:     scores["temp"] = 3
    elif temp <= 36.0:   scores["temp"] = 1
    elif temp <= 38.0:   scores["temp"] = 0
    elif temp <= 39.0:   scores["temp"] = 1
    else:                scores["temp"] = 2

    # Consciousness (AVPU scale)
    scores["gcs"] = 0 if gcs >= 15 else 3

    total = sum(scores.values())
    any_3 = any(v == 3 for v in scores.values())

    if total >= 7:
        risk, action = "HIGH",   "Urgent clinical review — consider HDU/ICU"
    elif total >= 5 or any_3:
        risk, action = "MEDIUM", "Urgent ward review within 1 hour"
    elif total >= 1:
        risk, action = "LOW+",   "Increase monitoring frequency"
    else:
        risk, action = "LOW",    "Continue routine monitoring"

    return {
        "score":      total,
        "risk":       risk,
        "action":     action,
        "components": scores,
        "any_single_3": any_3,
    }


# ── build ward state ───────────────────────────────────────────────────
def build_ward_state(patients: list[dict]) -> dict[str, dict]:
    state: dict[str, dict] = {}
    ward_occ: dict[str, int] = {}
    for p in patients:
        ward_occ[p["ward_id"]] = ward_occ.get(p["ward_id"], 0) + 1

    for w in WARDS:
        occ = ward_occ.get(w["id"], 0)
        cap = w["capacity"]
        state[w["id"]] = {
            "ward_id":   w["id"],
            "name":      w["name"],
            "facility":  w["facility"],
            "capacity":  cap,
            "occupied":  occ,
            "available": cap - occ,
            "pct":       round(occ / cap * 100, 1),
        }
    return state


# ── bed demand forecast (48 h, hourly) ────────────────────────────────
def build_bed_forecast(ward_state: dict[str, dict]) -> dict[str, list[dict]]:
    """
    Simple rule-based forecast:
      - Base occupancy oscillates on a 24-h sine wave (peak at 10:00, trough at 04:00)
      - Adds small random noise per step
      - Scales relative to current occupancy
    """
    now = time.time()
    forecasts: dict[str, list[dict]] = {}
    for wid, ws in ward_state.items():
        base = ws["occupied"]
        cap  = ws["capacity"]
        steps: list[dict] = []
        for h in range(49):
            ts = now + h * 3600
            hour_of_day = int(time.localtime(ts).tm_hour)
            sine_factor = 0.15 * math.sin(math.pi * (hour_of_day - 4) / 12)
            noise = _RNG.gauss(0, 0.5)
            predicted = max(0, min(cap, round(base + base * sine_factor + noise)))
            steps.append({
                "ts":        time.strftime("%Y-%m-%d %H:%M", time.localtime(ts)),
                "hour":      hour_of_day,
                "predicted": predicted,
                "capacity":  cap,
                "pct":       round(predicted / cap * 100, 1),
                "status":    "CRITICAL" if predicted / cap > 0.9 else
                             "WARNING"  if predicted / cap > 0.75 else "OK",
            })
        forecasts[wid] = steps
    return forecasts


# ── master seeding function called at startup ──────────────────────────
def seed_all() -> dict[str, Any]:
    """
    Build and return all simulated data structures.
    Called once at application startup to populate state.
    """
    patients  = build_simulated_patients(25)
    vitals    = build_vitals_series(patients, hours=48)
    ward_st   = build_ward_state(patients)
    forecast  = build_bed_forecast(ward_st)
    baselines = _compute_baselines(vitals)
    return {
        "patients":  patients,
        "vitals":    vitals,
        "ward_state": ward_st,
        "forecast":  forecast,
        "baselines": baselines,
    }


def _compute_baselines(vitals: dict[str, list[dict]]) -> dict[str, dict]:
    """Per-patient rolling baseline: mean ± SD for each vital metric."""
    baselines: dict[str, dict] = {}
    metrics = ["rr", "spo2", "sbp", "hr", "temp"]
    for sim_id, readings in vitals.items():
        bl: dict[str, dict] = {}
        for m in metrics:
            vals = [r[m] for r in readings if m in r]
            if vals:
                mean = sum(vals) / len(vals)
                std  = (sum((v - mean) ** 2 for v in vals) / len(vals)) ** 0.5
                bl[m] = {"mean": round(mean, 2), "std": round(max(std, 0.5), 2)}
        baselines[sim_id] = bl
    return baselines
