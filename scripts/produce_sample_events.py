#!/usr/bin/env python3
"""
Produce sample events to Kafka for Phase 1 testing.
Topics:
- ehr.patient
- ehr.encounter
- ehr.observation
- ehr.medication_request

Run after: infra (Kafka) is up. Consumer will upsert into Postgres and invalidate Redis caches.
Usage: python scripts/produce_sample_events.py
"""

import json
import os
from datetime import datetime, timedelta

from confluent_kafka import Producer

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


def main():
    producer = Producer({"bootstrap.servers": KAFKA_BOOTSTRAP})

    patients = [
        {
            "id": "P001",
            "nhi_number": "NHI001",
            "family_name": "Wang",
            "given_name": "Wei",
            "birth_date": "1980-05-15",
            "gender": "male",
        },
        {
            "id": "P002",
            "nhi_number": "NHI002",
            "family_name": "Chen",
            "given_name": "Mei",
            "birth_date": "1992-11-03",
            "gender": "female",
        },
        {
            "id": "P003",
            "nhi_number": "NHI003",
            "family_name": "Lin",
            "given_name": "Ming",
            "birth_date": "1975-01-22",
            "gender": "male",
        },
    ]

    base = datetime.utcnow() - timedelta(days=30)
    encounters = [
        ("E001", "P001", "FAC-A", "Pilot Hospital A", "finished", "AMB", base, base + timedelta(hours=1)),
        ("E002", "P001", "FAC-A", "Pilot Hospital A", "finished", "IMP", base - timedelta(days=5), base - timedelta(days=5) + timedelta(hours=24)),
        ("E003", "P001", "FAC-B", "Pilot Hospital B", "finished", "AMB", base - timedelta(days=14), base - timedelta(days=14) + timedelta(minutes=30)),
        ("E004", "P002", "FAC-A", "Pilot Hospital A", "finished", "AMB", base - timedelta(days=2), base - timedelta(days=2) + timedelta(hours=2)),
        ("E005", "P002", "FAC-B", "Pilot Hospital B", "finished", "EMER", base - timedelta(days=1), base - timedelta(days=1) + timedelta(hours=4)),
        ("E006", "P003", "FAC-B", "Pilot Hospital B", "finished", "AMB", base - timedelta(days=7), base - timedelta(days=7) + timedelta(hours=1)),
    ]

    for p in patients:
        producer.produce("ehr.patient", value=json.dumps({"resource": p}, default=str).encode("utf-8"))
        print(f"Sent patient {p['id']}")

    for eid, pid, fid, fname, status, cls, start, end in encounters:
        producer.produce(
            "ehr.encounter",
            value=json.dumps(
                {
                    "resource": {
                        "id": eid,
                        "patient_id": pid,
                        "facility_id": fid,
                        "facility_name": fname,
                        "status": status,
                        "class_code": cls,
                        "period_start": start.isoformat(),
                        "period_end": end.isoformat(),
                    }
                },
                default=str,
            ).encode("utf-8"),
        )
        print(f"Sent encounter {eid} (patient {pid})")

    # Observations (FHIR-ish)
    observations = [
        {
            "id": "O001",
            "patient_id": "P001",
            "code_text": "heart-rate",
            "effectiveDateTime": (base + timedelta(days=1)).isoformat() + "Z",
            "valueQuantity": {"value": 78, "unit": "bpm"},
        },
        {
            "id": "O002",
            "patient_id": "P001",
            "code_text": "body-temperature",
            "effectiveDateTime": (base + timedelta(days=1, minutes=5)).isoformat() + "Z",
            "valueQuantity": {"value": 36.8, "unit": "C"},
        },
        {
            "id": "O003",
            "patient_id": "P002",
            "code_text": "sbp",
            "effectiveDateTime": (base + timedelta(days=2)).isoformat() + "Z",
            "valueQuantity": {"value": 118, "unit": "mmHg"},
        },
    ]
    for o in observations:
        producer.produce(
            "ehr.observation",
            value=json.dumps({"resource": o}, default=str).encode("utf-8"),
        )
        print(f"Sent observation {o['id']} (patient {o['patient_id']})")

    # MedicationRequests (FHIR-ish)
    meds = [
        {
            "id": "M001",
            "patient_id": "P001",
            "status": "active",
            "authoredOn": (base + timedelta(days=1)).date().isoformat(),
            "medication_code": "metformin",
            "dosage_text": "500mg PO BID",
        },
        {
            "id": "M002",
            "patient_id": "P002",
            "status": "active",
            "authoredOn": (base + timedelta(days=2)).date().isoformat(),
            "medication_code": "amlodipine",
            "dosage_text": "5mg PO daily",
        },
    ]
    for m in meds:
        producer.produce(
            "ehr.medication_request",
            value=json.dumps({"resource": m}, default=str).encode("utf-8"),
        )
        print(f"Sent medication_request {m['id']} (patient {m['patient_id']})")

    producer.flush()
    producer.close()
    print("Done. Run the consumer to process events, then query the gateway.")


if __name__ == "__main__":
    main()
