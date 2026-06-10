#!/usr/bin/env python3
"""
Compare rule-v2.1.0 alerts vs trained sklearn model on the same labeled export.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ehr-api"))
sys.path.insert(0, str(ROOT / "ml"))

from app.ai.models import anomaly_check, compute_news2  # noqa: E402
from train.features import DEFAULT_LABEL, load_jsonl, rows_to_xy, vitals_labs_for_rules  # noqa: E402


def rules_positive(row: dict) -> bool:
    pid, vitals, labs = vitals_labs_for_rules(row)
    if anomaly_check(pid, vitals, labs):
        return True
    news2 = compute_news2(
        rr=int(vitals.get("rr", 16)),
        spo2=int(vitals.get("spo2", 98)),
        sbp=int(vitals.get("sbp", 120)),
        hr=int(vitals.get("hr", 75)),
        temp=float(vitals.get("temp", 37.0)),
        gcs=int(vitals.get("gcs", 15)),
    )
    return int(news2.get("score", 0)) >= 5


def main() -> int:
    parser = argparse.ArgumentParser(description="Rules vs ML on labeled JSONL")
    parser.add_argument("--features", type=Path, required=True)
    parser.add_argument("--model", type=Path, help="joblib from train_deterioration.py")
    parser.add_argument("--label", default=DEFAULT_LABEL)
    parser.add_argument("--ml-threshold", type=float, default=0.5)
    args = parser.parse_args()

    if not args.features.is_file():
        print(f"Missing {args.features}")
        return 1

    rows = load_jsonl(args.features)
    xs, ys, kept = rows_to_xy(rows, label_key=args.label)
    if not ys:
        print("No labeled rows.")
        return 1

    rule_pred = [1 if rules_positive(r) else 0 for r in kept]
    ml_pred: list[int] | None = None

    if args.model and args.model.is_file():
        try:
            import joblib
            import numpy as np
        except ImportError:
            print("pip install -r ml/requirements.txt")
            return 1
        pipe = joblib.load(args.model)
        proba = pipe.predict_proba(np.array(xs, dtype=np.float64))[:, 1]
        ml_pred = [1 if p >= args.ml_threshold else 0 for p in proba]

    def _counts(pred: list[int], truth: list[int]) -> dict[str, int]:
        tp = sum(1 for p, t in zip(pred, truth) if p == 1 and t == 1)
        fp = sum(1 for p, t in zip(pred, truth) if p == 1 and t == 0)
        fn = sum(1 for p, t in zip(pred, truth) if p == 0 and t == 1)
        tn = sum(1 for p, t in zip(pred, truth) if p == 0 and t == 0)
        return {"tp": tp, "fp": fp, "fn": fn, "tn": tn}

    truth = ys
    n_pos = sum(truth)
    print(f"Label={args.label} n={len(truth)} prevalence={n_pos / len(truth):.3f}")
    print(f"Rules vs label: {_counts(rule_pred, truth)}")
    if ml_pred is not None:
        print(f"ML (t={args.ml_threshold}) vs label: {_counts(ml_pred, truth)}")
    else:
        print("No --model; rules-only comparison.")
    print("Proxy labels only — not clinical validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
