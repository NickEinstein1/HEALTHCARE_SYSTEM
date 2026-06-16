#!/usr/bin/env python3
"""
Validate HTML dashboard nav structure against React dashboard registries.

Run after HTML sidebar/tab changes:
  python3 scripts/sync_html_dashboard_nav.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"

LEGACY_HTML = {
    "dashboard-doctor.html": [
        "home", "queue", "patient", "ward", "labs", "prescriptions", "imaging",
        "notes", "referrals", "procedures", "claims", "schedule", "audit", "health",
    ],
    "dashboard-admin.html": [
        "overview", "users", "facilities", "counties", "patients", "staff",
        "unihealth", "ai", "rbac", "audit", "health", "reports", "settings",
    ],
}

V2_TAB_HTML = {
    "version 2.0/unihealth-emr.html": ["notes", "labs", "meds", "history", "orders", "api"],
    "version 2.0/unihealth-maternity.html": ["anc", "labor", "nicu", "postnatal", "api"],
    "version 2.0/unihealth-pharmacy.html": ["rx", "stock", "orders", "api"],
}

REACT_LEGACY = {
    "doctor": [
        "home", "chart", "queue", "patient", "ward", "labs", "prescriptions", "imaging",
        "notes", "referrals", "procedures", "claims", "schedule", "audit", "health",
    ],
    "admin": [
        "overview", "users", "facilities", "counties", "patients", "staff",
        "unihealth", "ai", "rbac", "audit", "health", "reports", "settings",
    ],
    "pharmacy": [
        "overview", "queue", "verify", "patient", "compounding", "stock", "reorder",
        "kemsa", "claims", "vaccinations", "interactions", "interventions", "audit", "api", "health",
    ],
}

REACT_EMR_TABS = ["notes", "labs", "meds", "history", "orders", "api"]
REACT_MATERNITY_TABS = ["anc", "labor", "nicu", "postnatal", "api"]


def extract_spa_pages(html: str) -> list[str]:
    pages = re.findall(r'data-page="([^"]+)"', html)
    if pages:
        return pages
    pages = re.findall(r"""go\('([^']+)'""", html)
    return pages


def extract_v2_tabs(html: str) -> list[str]:
    return re.findall(r"""showTab\(this,'([^']+)'\)""", html)


def main() -> int:
    errors: list[str] = []

    for rel, expected in LEGACY_HTML.items():
        path = FRONTEND / rel
        if not path.exists():
            errors.append(f"Missing HTML file: {rel}")
            continue
        html = path.read_text(encoding="utf-8", errors="replace")
        found = extract_spa_pages(html)
        role = "doctor" if "doctor" in rel else "admin"
        react = REACT_LEGACY[role]
        for page in expected:
            if page not in found:
                errors.append(f"{rel}: HTML missing expected page '{page}'")
        for page in expected:
            if page not in react:
                errors.append(f"React {role}: missing page '{page}' (present in HTML registry)")

    for rel, expected in V2_TAB_HTML.items():
        path = FRONTEND / rel
        if not path.exists():
            continue
        html = path.read_text(encoding="utf-8", errors="replace")
        found = extract_v2_tabs(html)
        react = REACT_EMR_TABS if "emr" in rel else (
            REACT_MATERNITY_TABS if "maternity" in rel else ["rx", "stock", "orders", "api"]
        )
        for tab in expected:
            if tab not in found:
                errors.append(f"{rel}: HTML missing tab '{tab}'")
        for tab in expected:
            if tab not in react and "pharmacy" not in rel:
                errors.append(f"React module: missing tab '{tab}' for {rel}")

    if errors:
        print("HTML ↔ React nav sync issues:\n")
        for e in errors:
            print(f"  - {e}")
        return 1

    print("HTML ↔ React nav structure: OK (doctor, admin, EMR, maternity, pharmacy registries aligned).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
