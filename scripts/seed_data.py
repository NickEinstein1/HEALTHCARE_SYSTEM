#!/usr/bin/env python3
"""
Seed Phase 1 dev database with sample patients and encounters.
Run after: docker compose up -d (infra) and schema.sql applied.
"""

import asyncio
import os
import sys
from datetime import date, datetime, timedelta

# Add ehr-api to path so we can use asyncpg with same config
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ehr-api"))

import asyncpg

POSTGRES_DSN = os.environ.get(
    "EHR_POSTGRES_DSN",
    "postgresql://ehr:ehr_dev_password@localhost:5432/ehr",
)


async def seed():
    conn = await asyncpg.connect(POSTGRES_DSN)

    patients = [
        ("P001", "NHI001", "Wang", "Wei", date(1980, 5, 15), "male"),
        ("P002", "NHI002", "Chen", "Mei", date(1992, 11, 3), "female"),
        ("P003", "NHI003", "Lin", "Ming", date(1975, 1, 22), "male"),
    ]

    for pid, nhi, fam, given, bd, gender in patients:
        await conn.execute(
            """
            INSERT INTO patients (id, nhi_number, family_name, given_name, birth_date, gender)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO UPDATE SET
                family_name = EXCLUDED.family_name,
                given_name = EXCLUDED.given_name,
                updated_at = NOW()
            """,
            pid,
            nhi,
            fam,
            given,
            bd,
            gender,
        )

    base = datetime.utcnow() - timedelta(days=30)
    encounters = [
        ("E001", "P001", "FAC-A", "Pilot Hospital A", "finished", "AMB", base, base + timedelta(hours=1)),
        ("E002", "P001", "FAC-A", "Pilot Hospital A", "finished", "IMP", base - timedelta(days=5), base - timedelta(days=5) + timedelta(hours=24)),
        ("E003", "P001", "FAC-B", "Pilot Hospital B", "finished", "AMB", base - timedelta(days=14), base - timedelta(days=14) + timedelta(minutes=30)),
        ("E004", "P002", "FAC-A", "Pilot Hospital A", "finished", "AMB", base - timedelta(days=2), base - timedelta(days=2) + timedelta(hours=2)),
        ("E005", "P002", "FAC-B", "Pilot Hospital B", "finished", "EMER", base - timedelta(days=1), base - timedelta(days=1) + timedelta(hours=4)),
        ("E006", "P003", "FAC-B", "Pilot Hospital B", "finished", "AMB", base - timedelta(days=7), base - timedelta(days=7) + timedelta(hours=1)),
    ]

    for eid, pid, fid, fname, status, cls, start, end in encounters:
        await conn.execute(
            """
            INSERT INTO encounters (id, patient_id, facility_id, facility_name, status, class_code, period_start, period_end)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (id) DO UPDATE SET
                period_start = EXCLUDED.period_start,
                period_end = EXCLUDED.period_end,
                updated_at = NOW()
            """,
            eid,
            pid,
            fid,
            fname,
            status,
            cls,
            start,
            end,
        )

    await conn.close()
    print("Seed done: 3 patients, 6 encounters.")


if __name__ == "__main__":
    asyncio.run(seed())
