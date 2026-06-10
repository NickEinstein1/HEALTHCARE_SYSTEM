#!/usr/bin/env python3
"""
Baseline evaluator: apply rule-v2.1.0 on contract v1.0 feature rows.

Usage:
  python3 ml/eval/baseline_rules.py --features ml/data/features_staging.jsonl
  python3 ml/eval/baseline_rules.py --features ml/data/fixtures/sample_features.jsonl --label outcome_deterioration_7d
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ehr-api"))
sys.path.insert(0, str(ROOT / "ml"))

from app.ai.models import anomaly_check  # noqa: E402
from train.features import vitals_labs_for_rules  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate rule baseline on feature rows")
    parser.add_argument("--features", type=Path, help="JSONL contract v1.0")
    parser.add_argument("--label", default="outcome_deterioration_7d", help="Optional label column for prevalence")
    args = parser.parse_args()

    if not args.features or not args.features.is_file():
        print("No --features file. Export first: ./scripts/export_ml_features_staging.sh")
        return 0

    n_alert = 0
    n_rows = 0
    n_label_pos = 0
    with args.features.open(encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            pid, vitals, labs = vitals_labs_for_rules(row)
            hits = anomaly_check(pid, vitals, labs)
            n_alert += 1 if hits else 0
            n_rows += 1
            lab = row.get(args.label)
            if lab is not None:
                n_label_pos += int(lab)

    rate = (n_alert / n_rows) if n_rows else 0.0
    prev = (n_label_pos / n_rows) if n_rows else 0.0
    print(f"Rows={n_rows} rows_with_any_anomaly={n_alert} anomaly_rate={rate:.3f}")
    if n_rows:
        print(f"Label {args.label} prevalence={prev:.3f} (proxy labels — not clinical ground truth)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
