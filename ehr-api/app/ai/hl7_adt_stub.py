"""
Minimal HL7 v2 ADT extractor for UniHealth Phase 3 pilot census deltas.

Clinical warning: production ADT ingestion needs a full conformance profile,
visit keys, duplicate suppression, and idempotency — this module is demo scope.
"""

from __future__ import annotations

import re
from typing import Iterable

import app.state as st

from app.ai.ward_history import append_ward_census_snapshot

# Triggers mapped to roughly +1 / −1 inpatient bed count (pilot heuristic).
_TRIGGERS_INCREASE = frozenset({"A01", "A02", "A04", "A05", "A14"})
_TRIGGERS_DECREASE = frozenset({"A03", "A07", "A11", "A13"})
# A06 transfer out-of-inpatient / A07 bed swap — pilot treats A06 as −1 inpatient if ever used

_ADT_MSG_TYPE = re.compile(r"ADT\^([A-Za-z]\d{2})\b")


def _lines(message: str) -> list[str]:
    text = message.replace("\r\n", "\r").replace("\n", "\r")
    return [ln.strip() for ln in text.split("\r") if ln.strip()]


def extract_adt_trigger(message: str) -> str | None:
    """Return trigger code (e.g. A01) from ADT-like text."""
    for line in _lines(message):
        if line.startswith("MSH|"):
            m = _ADT_MSG_TYPE.search(line)
            if m:
                return m.group(1).upper()
        if line.startswith("EVN|"):
            cells = line.split("|")
            if len(cells) > 2 and cells[2]:
                evt = cells[2].strip()
                if "^" in evt:
                    evt = evt.split("^", 1)[0].strip()
                if len(evt) == 3 and evt[1:].isdigit():
                    return evt.upper()
                if evt:
                    return evt[:3].upper()
    return None


def extract_msh10_message_control_id(message: str) -> str | None:
    """
    Best-effort MSH-10 (message control ID) for idempotency.

    Looks for ``ADT^x`` segment token then the adjacent pipe-separated field — common feeder layout.
    """
    for line in _lines(message):
        if not line.startswith("MSH|"):
            continue
        cells = line.split("|")
        for idx, cell in enumerate(cells):
            if cell and ("ADT^" in cell):
                if idx + 1 < len(cells):
                    nxt = cells[idx + 1].strip()
                    if nxt:
                        return nxt[:512]
                break
    return None


def pv1_assigned_location_field(message: str) -> str | None:
    """Return raw PV1-3 Assigned Patient Location (HL7 ER7 string)."""
    for line in _lines(message):
        if line.startswith("PV1|"):
            cells = line.split("|")
            if len(cells) > 3:
                loc = cells[3].strip()
                return loc if loc else None
    return None


def resolve_ward_id(location_field: str | None, known_wards: Iterable[str]) -> str | None:
    """Find first token in PV1-3 composite that matches a known simulator ward."""
    ks = frozenset(known_wards)
    if not location_field:
        return None
    for tok in location_field.replace("&", "^").split("^"):
        c = tok.strip()
        if c in ks:
            return c
    return None


def apply_adt_delta_to_snapshot(ward_id: str, trigger: str) -> dict | None:
    """
    Bump occupied ±1 bounded by capacity, persist snapshot.

    Returns None if this ADT flavour does not change census (safe no-op).

    Raises ValueError("unknown ward_id") via append if ward missing — caller validates.
    """
    t = (trigger or "").strip().upper()
    if t not in _TRIGGERS_INCREASE | _TRIGGERS_DECREASE:
        return None

    ws = st.sim_ward_state.get(ward_id)
    if ws is None:
        raise ValueError(f"Unknown ward_id: {ward_id}")

    occ = int(ws["occupied"])
    cap = int(ws["capacity"])
    before = occ
    if t in _TRIGGERS_INCREASE:
        occ = min(cap, occ + 1)
    else:
        occ = max(0, occ - 1)

    if occ == before:
        return {
            "ward_id": ward_id,
            "occupied": occ,
            "capacity": cap,
            "skipped": True,
            "reason": "already_at_boundary",
            "trigger": t,
            "forecast_meta": None,
            "history_length": len(st.sim_ward_occ_history.get(ward_id, [])),
        }

    src = f"hl7/ADT^{t}"
    return append_ward_census_snapshot(ward_id, occ, source=src)
