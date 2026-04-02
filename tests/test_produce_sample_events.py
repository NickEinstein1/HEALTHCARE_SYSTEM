import importlib.util
from datetime import datetime, timezone
from pathlib import Path


def _load_producer_script():
    root = Path(__file__).resolve().parents[1]
    script_path = root / "scripts" / "produce_sample_events.py"
    spec = importlib.util.spec_from_file_location("produce_sample_events", script_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_to_zulu_returns_utc_suffix():
    mod = _load_producer_script()
    dt = datetime(2026, 2, 16, 13, 45, 0, tzinfo=timezone.utc)
    out = mod.to_zulu(dt)
    assert out.endswith("Z")
    assert out == "2026-02-16T13:45:00Z"
