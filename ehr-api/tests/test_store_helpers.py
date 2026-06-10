"""AI store merge helpers."""

from __future__ import annotations

from app.ai.store_helpers import merge_anomaly_lists, memory_anomalies_for_merge


def test_merge_dedupes_by_id() -> None:
    a = {"id": "A1", "patient_id": "P001"}
    b = {"id": "A1", "patient_id": "P001", "severity": "HIGH"}
    out = merge_anomaly_lists([a], [b], limit=10)
    assert len(out) == 1


def test_memory_anomalies_for_merge_without_postgres(monkeypatch) -> None:
    import app.store as store_mod

    monkeypatch.setattr(store_mod, "_pg_pool", None)
    rows = [{"id": "1", "patient_id": "P001"}, {"id": "2", "patient_id": "SIM-001"}]
    assert len(memory_anomalies_for_merge(rows, patient_id="P001")) == 1


def test_memory_portal_empty_when_postgres(monkeypatch) -> None:
    import app.store as store_mod

    monkeypatch.setattr(store_mod, "_pg_pool", object())
    rows = [{"id": "1", "patient_id": "P001"}, {"id": "2", "patient_id": "SIM-001"}]
    assert memory_anomalies_for_merge(rows, patient_id="P001") == []
    assert len(memory_anomalies_for_merge(rows, patient_id="SIM-001")) == 1
