"""
Pilot EMR ingestion: publish Patient/Encounter/Observation/MedicationRequest to Kafka
(consumer writes to Postgres/Redis).

Implementation: confluent-kafka Producer for Python 3.13 compatibility.
"""

import json
from typing import Any

from confluent_kafka import Producer

from app.config import settings

_producer: Producer | None = None


def _default_serializer(obj: Any) -> str:
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def get_producer() -> Producer:
    global _producer
    if _producer is None:
        _producer = Producer({"bootstrap.servers": settings.kafka_bootstrap_servers})
    return _producer


def send_patient(resource: dict) -> None:
    """Publish patient to ehr.patient. Consumer expects payload with 'resource'."""
    pid = resource.get("id")
    if not pid:
        raise ValueError("Patient resource must have 'id'")
    payload = json.dumps({"resource": resource}, default=_default_serializer).encode("utf-8")
    get_producer().produce("ehr.patient", value=payload)
    get_producer().flush()


def send_encounter(resource: dict) -> None:
    """Publish encounter to ehr.encounter. Consumer expects payload with 'resource'."""
    eid = resource.get("id")
    pid = resource.get("patient_id") or (resource.get("subject") or {}).get("reference", "").split("/")[-1]
    if not eid or not pid:
        raise ValueError("Encounter resource must have 'id' and 'patient_id' (or subject.reference)")
    payload = json.dumps({"resource": resource}, default=_default_serializer).encode("utf-8")
    get_producer().produce("ehr.encounter", value=payload)
    get_producer().flush()


def send_observation(resource: dict) -> None:
    """Publish observation to ehr.observation. Required: id and patient_id (or subject.reference)."""
    oid = resource.get("id")
    pid = resource.get("patient_id") or (resource.get("subject") or {}).get("reference", "").split("/")[-1]
    if not oid or not pid:
        raise ValueError("Observation resource must have 'id' and 'patient_id' (or subject.reference)")
    payload = json.dumps({"resource": resource}, default=_default_serializer).encode("utf-8")
    get_producer().produce("ehr.observation", value=payload)
    get_producer().flush()


def send_medication_request(resource: dict) -> None:
    """Publish MedicationRequest to ehr.medication_request. Required: id and patient_id (or subject.reference)."""
    mid = resource.get("id")
    pid = resource.get("patient_id") or (resource.get("subject") or {}).get("reference", "").split("/")[-1]
    if not mid or not pid:
        raise ValueError("MedicationRequest must have 'id' and 'patient_id' (or subject.reference)")
    payload = json.dumps({"resource": resource}, default=_default_serializer).encode("utf-8")
    get_producer().produce("ehr.medication_request", value=payload)
    get_producer().flush()


def send_allergy_intolerance(resource: dict) -> None:
    """Publish AllergyIntolerance to ehr.allergy_intolerance."""
    aid = resource.get("id")
    pid = resource.get("patient_id") or (resource.get("patient") or {}).get("reference", "").split("/")[-1]
    if not aid or not pid:
        raise ValueError("AllergyIntolerance must have 'id' and 'patient_id' (or patient.reference)")
    payload = json.dumps({"resource": resource}, default=_default_serializer).encode("utf-8")
    get_producer().produce("ehr.allergy_intolerance", value=payload)
    get_producer().flush()
