"""
Pilot EMR ingestion: publish Patient/Encounter to Kafka (consumer writes to Postgres/Redis).
"""

import json
from typing import Any

from kafka import KafkaProducer
from kafka.errors import KafkaError

from app.config import settings

_producer: KafkaProducer | None = None


def _default_serializer(obj: Any) -> str:
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def get_producer() -> KafkaProducer:
    global _producer
    if _producer is None:
        _producer = KafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers.split(","),
            value_serializer=lambda v: json.dumps(v, default=_default_serializer).encode("utf-8"),
        )
    return _producer


def send_patient(resource: dict) -> None:
    """Publish patient to ehr.patient. Consumer expects payload with 'resource'."""
    pid = resource.get("id")
    if not pid:
        raise ValueError("Patient resource must have 'id'")
    get_producer().send("ehr.patient", value={"resource": resource})
    get_producer().flush()


def send_encounter(resource: dict) -> None:
    """Publish encounter to ehr.encounter. Consumer expects payload with 'resource'."""
    eid = resource.get("id")
    pid = resource.get("patient_id") or (resource.get("subject") or {}).get("reference", "").split("/")[-1]
    if not eid or not pid:
        raise ValueError("Encounter resource must have 'id' and 'patient_id' (or subject.reference)")
    get_producer().send("ehr.encounter", value={"resource": resource})
    get_producer().flush()
