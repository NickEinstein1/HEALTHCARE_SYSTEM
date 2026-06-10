"""HL7 ADT stub — trigger extraction and ward resolution (no gateway)."""

from __future__ import annotations

from app.ai.hl7_adt_stub import (
    extract_adt_trigger,
    extract_msh10_message_control_id,
    parse_hl7_adt_message,
    pv1_assigned_location_field,
    resolve_ward_id,
    validate_hl7_message,
)


def test_extract_adt_a01_from_msh() -> None:
    msg = "MSH|^~\\&|S|R|UH|UH|202601011200||ADT^A01|ctrl-1|P|2.5"
    assert extract_adt_trigger(msg) == "A01"


def test_extract_msh10() -> None:
    msg = "MSH|^~\\&|S|R|UH|UH|202601011200||ADT^A01|ctrl-42|P|2.5"
    assert extract_msh10_message_control_id(msg) == "ctrl-42"


def test_pv1_location() -> None:
    msg = "MSH|x\rPV1|1|I|WARD-A^Bed 1^FAC-A"
    assert "WARD-A" in (pv1_assigned_location_field(msg) or "")


def test_resolve_ward_id_known() -> None:
    wid = resolve_ward_id("WARD-A^1^FAC", frozenset({"WARD-A", "WARD-B"}))
    assert wid == "WARD-A"


def test_validate_hl7_rejects_empty() -> None:
    import pytest

    with pytest.raises(ValueError, match="empty"):
        validate_hl7_message("  ")


def test_parse_hl7_adt_message_structured() -> None:
    msg = "MSH|^~\\&|S|R|UH|UH|202601011200||ADT^A01|ctrl-99|P|2.5\rPV1|1|I|WARD-A"
    parsed = parse_hl7_adt_message(msg)
    assert parsed["trigger"] == "A01"
    assert parsed["msh10"] == "ctrl-99"
    assert parsed["segment_count"] >= 2
