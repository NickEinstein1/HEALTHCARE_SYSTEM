#!/usr/bin/env python3
"""Verify UniHealth pilot tables and seed rows on Postgres (local or Supabase)."""

from __future__ import annotations

import asyncio
import os
import sys

import asyncpg

REQUIRED_TABLES = [
    "patients",
    "encounters",
    "consents",
    "billing_invoices",
    "billing_payments",
    "mpesa_transactions",
    "uhic_members",
    "uhic_policies",
    "uhic_claims",
    "uhic_premium_ledger",
    "uhic_provider_scores",
    "uhic_claim_audit",
    "uhic_sync_meta",
]

REQUIRED_PATIENTS = ("P001", "P002", "P003")


def _dsn() -> str:
    dsn = os.environ.get("EHR_POSTGRES_DSN") or (
        "postgresql://ehr:ehr_dev_password@localhost:5432/ehr"
    )
    if "sslmode=" not in dsn and "supabase" in dsn.lower():
        dsn = dsn + ("&" if "?" in dsn else "?") + "sslmode=require"
    return dsn


async def main() -> int:
    dsn = _dsn()
    # asyncpg uses ssl=True / ssl='require' separately from query string in some versions
    connect_kwargs: dict = {}
    if "supabase.com" in dsn or "sslmode=require" in dsn:
        connect_kwargs["ssl"] = "require"
    try:
        conn = await asyncpg.connect(dsn, **connect_kwargs)
    except Exception as exc:
        print(f"FAIL: cannot connect: {exc}")
        return 1

    try:
        missing = []
        for table in REQUIRED_TABLES:
            exists = await conn.fetchval(
                """
                SELECT EXISTS (
                  SELECT 1 FROM information_schema.tables
                  WHERE table_schema = 'public' AND table_name = $1
                )
                """,
                table,
            )
            if not exists:
                missing.append(table)
        if missing:
            print(f"FAIL: missing tables: {', '.join(missing)}")
            return 1
        print(f"OK  tables ({len(REQUIRED_TABLES)})")

        rows = await conn.fetch("SELECT id FROM patients WHERE id = ANY($1::text[])", list(REQUIRED_PATIENTS))
        found = {r["id"] for r in rows}
        missing_p = [p for p in REQUIRED_PATIENTS if p not in found]
        if missing_p:
            print(f"FAIL: missing seed patients: {', '.join(missing_p)} (run scripts/seed_data.py)")
            return 1
        print(f"OK  patients {', '.join(REQUIRED_PATIENTS)}")

        enc = await conn.fetchval("SELECT COUNT(*)::int FROM encounters")
        print(f"OK  encounters count={enc}")

        # Billing / UHIC may be empty until API bootstrap — that is fine
        inv = await conn.fetchval("SELECT COUNT(*)::int FROM billing_invoices")
        mem = await conn.fetchval("SELECT COUNT(*)::int FROM uhic_members")
        print(f"OK  billing_invoices={inv} uhic_members={mem} (populated on API startup if empty)")

        # Spot-check unique indexes for M-Pesa receipts
        idx = await conn.fetchval(
            """
            SELECT COUNT(*)::int FROM pg_indexes
            WHERE schemaname = 'public'
              AND indexname IN ('uq_billing_payments_mpesa_receipt', 'uq_mpesa_tx_receipt')
            """
        )
        if idx < 2:
            print("WARN: M-Pesa receipt unique indexes missing — re-apply ehr-api/schema.sql")
        else:
            print("OK  mpesa receipt unique indexes")

        print("VERIFY PASSED")
        return 0
    finally:
        await conn.close()


if __name__ == "__main__":
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "ehr-api"))
    raise SystemExit(asyncio.run(main()))
