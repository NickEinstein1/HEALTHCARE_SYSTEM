#!/usr/bin/env python3
"""
Train a baseline logistic model for outcome_deterioration_7d (or --label).

Staging labels are proxy-only (derived_encounter_vitals_v1). Do not deploy without
clinical sign-off. See ml/data-contract.md.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ml"))

from train.features import (  # noqa: E402
    DEFAULT_LABEL,
    feature_dim,
    load_jsonl,
    rows_to_xy,
)

DISCLAIMER = (
    "Rules-based CDS pilot — trained artifact is experimental. "
    "Not validated diagnostic AI."
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Train deterioration baseline (Tier C)")
    parser.add_argument(
        "--features",
        type=Path,
        default=ROOT / "ml/data/features_staging.jsonl",
        help="Contract v1.0 JSONL export",
    )
    parser.add_argument("--label", default=DEFAULT_LABEL, help="Outcome column name")
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "ml/models/deterioration_v1.joblib",
        help="Serialized sklearn pipeline",
    )
    parser.add_argument("--min-rows", type=int, default=3, help="Minimum labeled rows")
    parser.add_argument("--test-fraction", type=float, default=0.25, help="Hold-out fraction")
    args = parser.parse_args()

    if not args.features.is_file():
        print(f"Missing features file: {args.features}")
        print("Run: ./scripts/export_ml_features_staging.sh")
        return 1

    try:
        import joblib  # noqa: F401
        import numpy as np
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import roc_auc_score
        from sklearn.model_selection import train_test_split
        from sklearn.pipeline import Pipeline
        from sklearn.preprocessing import StandardScaler
    except ImportError:
        print("Install ML deps: python3 -m pip install -r ml/requirements.txt")
        return 1

    rows = load_jsonl(args.features)
    xs, ys, kept = rows_to_xy(rows, label_key=args.label)
    if len(xs) < args.min_rows:
        print(f"Need at least {args.min_rows} labeled rows; got {len(xs)}")
        return 1

    positives = sum(ys)
    if positives == 0 or positives == len(ys):
        print(
            f"Label {args.label} has no variation (pos={positives}, n={len(ys)}). "
            "Add more staging patients or use a different label."
        )
        return 1

    x = np.array(xs, dtype=np.float64)
    y = np.array(ys, dtype=np.int32)

    stratify = y if len(set(ys)) > 1 and min(ys) >= 1 else None
    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=min(args.test_fraction, 0.49),
        random_state=42,
        stratify=stratify,
    )

    pipe = Pipeline(
        steps=[
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=500, class_weight="balanced")),
        ]
    )
    pipe.fit(x_train, y_train)

    metrics: dict[str, float | int | str | None] = {"n_train": len(y_train), "n_test": len(y_test)}
    if len(y_test) > 0 and len(set(y_test.tolist())) > 1:
        proba = pipe.predict_proba(x_test)[:, 1]
        metrics["roc_auc_holdout"] = float(roc_auc_score(y_test, proba))
    else:
        metrics["roc_auc_holdout"] = None

    args.out.parent.mkdir(parents=True, exist_ok=True)
    import joblib

    joblib.dump(pipe, args.out)

    meta_path = args.out.with_suffix(".meta.json")
    meta = {
        "model_type": "sklearn_logistic_v1",
        "label": args.label,
        "feature_dim": feature_dim(),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "label_source": kept[0].get("label_source") if kept else None,
        "contract_version": "1.0",
        "metrics": metrics,
        "disclaimer": DISCLAIMER,
    }
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"Wrote model {args.out}")
    print(f"Wrote meta  {meta_path}")
    print(f"Rows={len(xs)} pos={positives} metrics={metrics}")
    print(DISCLAIMER)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
