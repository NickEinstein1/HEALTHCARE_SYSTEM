import importlib.util
from pathlib import Path


def _load_consumer_module():
    root = Path(__file__).resolve().parents[1]
    module_path = root / "edge-pipeline" / "consumer" / "main.py"
    spec = importlib.util.spec_from_file_location("edge_pipeline_consumer_main", module_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_parse_date_iso_string():
    mod = _load_consumer_module()
    parsed = mod.parse_date("2026-02-16")
    assert str(parsed) == "2026-02-16"


def test_parse_datetime_zulu_string():
    mod = _load_consumer_module()
    parsed = mod.parse_datetime("2026-02-16T12:00:00Z")
    assert parsed is not None
    assert parsed.tzinfo is not None
    assert parsed.isoformat() == "2026-02-16T12:00:00+00:00"
