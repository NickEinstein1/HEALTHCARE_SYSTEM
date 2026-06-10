#!/usr/bin/env python3
"""
Seed observations + medications for P001 so AI Assist has real FHIR inputs.

Requires: schema.sql applied, patients seeded (scripts/seed_data.py).

  python3 scripts/seed_p001_clinical_demo.py
  EHR_POSTGRES_DSN=postgresql://... python3 scripts/seed_p001_clinical_demo.py
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ehr-api"))

import asyncpg

POSTGRES_DSN = os.environ.get(
    "EHR_POSTGRES_DSN",
    "postgresql://ehr:ehr_dev_password@localhost:5432/ehr",
)

P001 = "P001"
NOW = datetime.now(timezone.utc)


def _obs(oid: str, code: str, value: str, unit: str | None = None) -> tuple:
    resource = {
        "resourceType": "Observation",
        "id": oid,
        "status": "final",
        "code": {"text": code},
        "subject": {"reference": f"Patient/{P001}"},
        "effectiveDateTime": NOW.isoformat(),
        "valueQuantity": {"value": value, "unit": unit} if unit else None,
        "valueString": value if not unit else None,
    }
    return oid, code, NOW, value, unit, json.dumps(resource)


OBSERVATIONS = [
    _obs("OBS-P001-BP", "Blood pressure systolic", "128/82", "mmHg"),
    _obs("OBS-P001-HR", "Heart rate", "98", "/min"),
    _obs("OBS-P001-RR", "Respiratory rate", "20", "/min"),
    _obs("OBS-P001-SPO2", "Oxygen saturation", "94", "%"),
    _obs("OBS-P001-TEMP", "Body temperature", "38.2", "Cel"),
    _obs("OBS-P001-K", "Potassium", "5.6", "mmol/L"),
    _obs("OBS-P001-GLU", "Blood glucose", "11.2", "mmol/L"),
    _obs("OBS-P001-CRP", "CRP", "62", "mg/L"),
    _obs("OBS-P001-CREAT", "Creatinine", "145", "umol/L"),
]

MEDICATIONS = [
    (
        "MED-P001-WARF",
        "Warfarin 5mg",
        "active",
        "5mg daily",
        json.dumps(
            {
                "resourceType": "MedicationRequest",
                "id": "MED-P001-WARF",
                "status": "active",
                "medicationCodeableConcept": {"text": "Warfarin 5mg"},
                "subject": {"reference": f"Patient/{P001}"},
            }
        ),
    ),
    (
        "MED-P001-ASP",
        "Aspirin 75mg",
        "active",
        "75mg daily",
        json.dumps(
            {
                "resourceType": "MedicationRequest",
                "id": "MED-P001-ASP",
                "status": "active",
                "medicationCodeableConcept": {"text": "Aspirin 75mg"},
                "subject": {"reference": f"Patient/{P001}"},
            }
        ),
    ),
]


async def seed() -> None:
    conn = await asyncpg.connect(POSTGRES_DSN)
    for oid, code, eff, val, unit, rj in OBSERVATIONS:
        await conn.execute(
            """
            INSERT INTO observations (id, patient_id, code, effective_time, value_text, unit, resource_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
            ON CONFLICT (id) DO UPDATE SET
                value_text = EXCLUDED.value_text,
                effective_time = EXCLUDED.effective_time,
                updated_at = NOW()
            """,
            oid,
            P001,
            code,
            eff,
            val,
            unit,
            rj,
        )
    for mid, med_code, status, dose, rj in MEDICATIONS:
        await conn.execute(
            """
            INSERT INTO medication_requests
              (id, patient_id, medication_code, status, authored_on, dosage_text, resource_json)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
            ON CONFLICT (id) DO UPDATE SET
                medication_code = EXCLUDED.medication_code,
                status = EXCLUDED.status,
                updated_at = NOW()
            """,
            mid,
            P001,
            med_code,
            status,
            NOW,
            dose,
            rj,
        )
    await conn.close()
    print(f"Seeded {len(OBSERVATIONS)} observations and {len(MEDICATIONS)} meds for {P001}.")


if __name__ == "__main__":
    asyncio.run(seed())
