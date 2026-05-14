"""
Patient-specific vital baselines from real (simulated or ingested) time series.

Recomputes mean / SD per metric whenever vitals readings exist — used by
`anomaly_check` z-score pathway. KDPA-aligned: deterministic, reproducible stats.
"""

from __future__ import annotations

from typing import Any

METRICS = ["rr", "spo2", "sbp", "dbp", "hr", "temp", "gcs"]
MIN_SAMPLES_Z = 4
MIN_STD = 0.55


def compute_baselines_from_readings(readings: list[dict] | None) -> dict[str, dict[str, float | int]]:
    """
    Population mean ± SD across all readings per metric.

    Keys returned per metric: mean, std, n
    Uses sample standard deviation when n ≥ 2.
    """
    if not readings:
        return {}
    bl: dict[str, dict[str, float | int]] = {}
    for m in METRICS:
        vals: list[float] = []
        for r in readings:
            if m not in r or r[m] is None:
                continue
            try:
                vals.append(float(r[m]))
            except (TypeError, ValueError):
                continue
        n = len(vals)
        if n < 2:
            continue
        mean = sum(vals) / n
        if n >= 2:
            variance = sum((v - mean) ** 2 for v in vals) / (n - 1)
            std = variance ** 0.5
        else:
            std = MIN_STD
        std_eff = round(max(std, MIN_STD), 3)
        bl[m] = {
            "mean": round(mean, 3),
            "std":  std_eff,
            "n":    n,
        }
    return bl


def resolve_baseline_from_vitals(patient_id: str, vitals_lookup: dict[str, Any]) -> dict[str, dict]:
    """
    Align API patient_id with sim_vitals keys; return mean/std/n baselines or {}.
    """
    if patient_id in vitals_lookup:
        return compute_baselines_from_readings(vitals_lookup[patient_id])
    pid = patient_id.strip().upper()
    for key in vitals_lookup:
        if key.strip().upper() == pid:
            return compute_baselines_from_readings(vitals_lookup[key])
    return {}
