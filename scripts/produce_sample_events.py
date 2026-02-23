#!/usr/bin/env python3
"""
Produce sample Patient and Encounter events to Kafka for Phase 1 testing.
Run after: infra (Kafka) is up. Consumer will upsert into Postgres and invalidate Redis.
Usage: python scripts/produce_sample_events.py
"""

import json
import os
from datetime import datetime, timedelta

from kafka import KafkaProducer

KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


def main():
    producer = KafkaProducer(
        bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
        value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
    )

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
        producer.send("ehr.patient", value={"resource": p})
        print(f"Sent patient {p['id']}")

    for eid, pid, fid, fname, status, cls, start, end in encounters:
        producer.send(
            "ehr.encounter",
            value={
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
        )
        print(f"Sent encounter {eid} (patient {pid})")

    producer.flush()
    producer.close()
    print("Done. Run the consumer to process events, then query the gateway.")


if __name__ == "__main__":
    main()
