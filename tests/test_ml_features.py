"""Tier C ML feature parsing and training smoke (no Postgres)."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
ML = ROOT / "ml"
FIXTURE = ML / "data/fixtures/sample_features.jsonl"


@pytest.fixture(scope="module")
def sample_rows():
    sys.path.insert(0, str(ML))
    from train.features import load_jsonl, rows_to_xy, row_to_vector, vitals_labs_for_rules

    rows = load_jsonl(FIXTURE)
    return {
        "rows": rows,
        "load_jsonl": load_jsonl,
        "rows_to_xy": rows_to_xy,
        "row_to_vector": row_to_vector,
        "vitals_labs_for_rules": vitals_labs_for_rules,
    }


def test_fixture_contract(sample_rows):
    rows = sample_rows["rows"]
    assert len(rows) == 4
    assert all(r.get("contract_version") == "1.0" for r in rows)


def test_row_to_vector_dim(sample_rows):
    xs, ys, kept = sample_rows["rows_to_xy"](sample_rows["rows"])
    assert len(xs) == len(ys) == 4
    assert len(xs[0]) == len(sample_rows["row_to_vector"](kept[0]))
    assert sum(ys) == 3


def test_vitals_labs_for_rules(sample_rows):
    row = sample_rows["rows"][-1]
    pid, vitals, labs = sample_rows["vitals_labs_for_rules"](row)
    assert pid.startswith("P")
    assert vitals["temp"] == 38.2
    assert labs and labs["potassium"] == 5.6


def test_baseline_rules_script():
    proc = subprocess.run(
        [sys.executable, str(ML / "eval/baseline_rules.py"), "--features", str(FIXTURE)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
    assert "Rows=4" in proc.stdout


@pytest.mark.skipif(
    not (ML / "requirements.txt").exists(),
    reason="ml requirements present",
)
def test_train_on_fixture(tmp_path):
    sklearn = pytest.importorskip("sklearn")
    del sklearn
    out = tmp_path / "model.joblib"
    proc = subprocess.run(
        [
            sys.executable,
            str(ML / "train/train_deterioration.py"),
            "--features",
            str(FIXTURE),
            "--out",
            str(out),
            "--min-rows",
            "3",
        ],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert out.is_file()
    meta = out.with_suffix(".meta.json")
    assert meta.is_file()
    data = json.loads(meta.read_text(encoding="utf-8"))
    assert "sklearn_logistic_v1" in data["model_type"]
