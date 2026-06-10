"""
Parse contract v1.0 JSONL exports into numeric matrices for training and evaluation.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Iterator

CONTRACT_VERSION = "1.0"

# Fixed column order for sklearn pipelines
NUMERIC_KEYS: list[str] = [
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
    "medication_active_count",
]

AGE_BANDS = ("under_40", "40_64", "65_plus", "unknown")
SEX_VALUES = ("male", "female", "unknown")
ENCOUNTER_CLASSES = ("AMB", "IMP", "EMER", "unknown")

DEFAULT_LABEL = "outcome_deterioration_7d"


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def snapshots_from_row(row: dict[str, Any]) -> tuple[dict[str, float], dict[str, float]]:
    vitals_raw = row.get("vitals_snapshot") or {}
    labs_raw = row.get("lab_snapshot") or {}
    vitals = {k: float(vitals_raw[k]) for k in vitals_raw if vitals_raw[k] is not None}
    labs = {k: float(labs_raw[k]) for k in labs_raw if labs_raw[k] is not None}
    return vitals, labs


def vitals_labs_for_rules(row: dict[str, Any]) -> tuple[str, dict[str, float], dict[str, float] | None]:
    """Shape expected by ehr-api anomaly_check."""
    pid = str(row.get("pseudo_id") or row.get("patient_id") or "unknown")
    vitals, labs = snapshots_from_row(row)
    return pid, vitals, labs or None


def _one_hot(value: str, categories: tuple[str, ...]) -> list[float]:
    return [1.0 if value == c else 0.0 for c in categories]


def row_to_vector(row: dict[str, Any]) -> list[float]:
    vitals, labs = snapshots_from_row(row)
    merged: dict[str, float] = {**vitals, **labs}
    vec = [float(merged.get(k, 0.0)) for k in NUMERIC_KEYS[:11]]
    vec.append(float(row.get("medication_active_count") or 0))
    vec.extend(_one_hot(str(row.get("age_band", "unknown")), AGE_BANDS))
    vec.extend(_one_hot(str(row.get("sex", "unknown")), SEX_VALUES))
    vec.extend(_one_hot(str(row.get("encounter_class", "unknown")), ENCOUNTER_CLASSES))
    return vec


def rows_to_xy(
    rows: list[dict[str, Any]],
    *,
    label_key: str = DEFAULT_LABEL,
) -> tuple[list[list[float]], list[int], list[dict[str, Any]]]:
    xs: list[list[float]] = []
    ys: list[int] = []
    kept: list[dict[str, Any]] = []
    for row in rows:
        if row.get("contract_version") not in (CONTRACT_VERSION, None):
            continue
        label = row.get(label_key)
        if label is None:
            continue
        xs.append(row_to_vector(row))
        ys.append(int(label))
        kept.append(row)
    return xs, ys, kept


def feature_dim() -> int:
    return len(NUMERIC_KEYS) + len(AGE_BANDS) + len(SEX_VALUES) + len(ENCOUNTER_CLASSES)


def iter_rows(path: Path) -> Iterator[dict[str, Any]]:
    yield from load_jsonl(path)
