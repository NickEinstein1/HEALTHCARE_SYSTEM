"""Merge in-memory simulator anomalies with durable Postgres rows."""

from __future__ import annotations

from app.store import has_postgres_pool


def _is_sim_patient(patient_id: str | None) -> bool:
    if not patient_id:
        return False
    return str(patient_id).strip().upper().startswith("SIM")


def filter_memory_anomalies(
    memory_rows: list[dict],
    *,
    patient_id: str | None = None,
    severity: str | None = None,
    ack: bool | None = None,
) -> list[dict]:
    """In-memory rows used for simulator demos; optional filters."""
    rows = list(memory_rows)
    if patient_id:
        rows = [a for a in rows if str(a.get("patient_id", "")) == patient_id]
    if severity:
        rows = [a for a in rows if str(a.get("severity", "")).upper() == severity.upper()]
    if ack is not None:
        rows = [a for a in rows if bool(a.get("acknowledged")) == ack]
    return rows


def memory_anomalies_for_merge(
    memory_rows: list[dict],
    *,
    patient_id: str | None = None,
) -> list[dict]:
    """
    When Postgres is active, only merge SIM-* rows from memory (ward simulator).
    Portal patients (P001, …) come from Postgres + live FHIR rules only.
    """
    if not has_postgres_pool():
        return filter_memory_anomalies(memory_rows, patient_id=patient_id)
    sim_rows = [a for a in memory_rows if _is_sim_patient(a.get("patient_id"))]
    if patient_id:
        if _is_sim_patient(patient_id):
            return [a for a in sim_rows if str(a.get("patient_id", "")) == patient_id]
        return []
    return sim_rows


def merge_anomaly_lists(
    durable: list[dict],
    memory: list[dict],
    *,
    limit: int,
) -> list[dict]:
    """Durable first, then memory; dedupe by id."""
    seen: set[str] = set()
    out: list[dict] = []
    for a in durable + memory:
        aid = str(a.get("id") or "")
        if not aid or aid in seen:
            continue
        seen.add(aid)
        out.append(a)
        if len(out) >= limit:
            break
    return out
