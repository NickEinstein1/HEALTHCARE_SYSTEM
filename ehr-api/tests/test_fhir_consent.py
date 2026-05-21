"""FHIR Consent resource mapping."""

import pytest

from app.consent_fhir import consent_id, parse_fhir_consent, row_to_fhir_consent


def test_consent_id_stable() -> None:
    assert consent_id("P001", "FAC-A", "treatment") == "consent-P001-FAC-A-treatment"


def test_row_to_fhir_consent() -> None:
    r = row_to_fhir_consent(patient_id="P001", facility_id="FAC-A", scope="treatment", active=True)
    assert r["resourceType"] == "Consent"
    assert r["status"] == "active"
    assert r["patient"]["reference"] == "Patient/P001"


def test_parse_fhir_consent() -> None:
    resource = row_to_fhir_consent(patient_id="P001", facility_id="FAC-A", scope="emergency", active=True)
    pid, fac, scope = parse_fhir_consent(resource)
    assert pid == "P001"
    assert fac == "FAC-A"
    assert scope == "emergency"


def test_parse_fhir_consent_missing_patient() -> None:
    with pytest.raises(ValueError, match="patient"):
        parse_fhir_consent({"resourceType": "Consent", "provision": {}})
