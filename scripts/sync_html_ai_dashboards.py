#!/usr/bin/env python3
"""
Sync AI Assist integration across ALL static HTML dashboards and mirror CSS to React.

Run after HTML design changes:
  python3 scripts/sync_html_ai_dashboards.py

React dashboards (frontend/app) use matching components:
  AiRiskScorePanel, AiPatientInsightsWidget, AiAdminStatusWidget
"""
from __future__ import annotations

import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
REACT_CSS = ROOT / "frontend/app/src/styles/ai-assist-dashboard.css"
HTML_CSS = FRONTEND / "ai-assist-dashboard.css"

MountKind = Literal["risk", "patient", "admin", "none"]
Mode = Literal["spa", "static", "v2_static"]


@dataclass
class DashboardSpec:
    rel_path: str
    role: str
    mode: Mode
    mounts: tuple[MountKind, ...]
    asset_prefix: str = ""
    v2: bool = False


# All full dashboard HTML files (excludes redirects and auth-only pages)
DASHBOARDS: list[DashboardSpec] = [
    # Legacy role dashboards
    DashboardSpec("dashboard-doctor.html", "doctor", "spa", ("risk",)),
    DashboardSpec("DOCTOR PAGE.html", "patient", "spa", ("patient",)),  # misnamed — patient portal
    DashboardSpec("dashboard-nurse.html", "nurse", "spa", ("risk",)),
    DashboardSpec("NURSE PAGE.html", "nurse", "spa", ("risk",)),
    DashboardSpec("dashboard-patient.html", "patient", "static", ("patient",)),
    DashboardSpec("PATIENT PAGE.html", "patient", "spa", ("patient",)),
    DashboardSpec("dashboard-admin.html", "admin", "static", ("admin",)),
    DashboardSpec("ADMIN PAGE.html", "admin", "spa", ("admin",)),
    DashboardSpec("pharmacy.html", "pharmacy", "spa", ("admin",)),
    DashboardSpec("lab page.html", "lab", "spa", ("admin",)),
    # v2.0 module dashboards
    DashboardSpec("version 2.0/unihealth-emr.html", "doctor", "v2_static", ("risk",), "../", True),
    DashboardSpec("version 2.0/unihealth-patient.html", "patient", "v2_static", ("patient",), "../", True),
    DashboardSpec("version 2.0/unihealth-admin.html", "admin", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-nurse.html", "nurse", "v2_static", ("risk",), "../", True),
    DashboardSpec("version 2.0/unihealth-lab.html", "lab", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-pharmacy.html", "pharmacy", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-maternity.html", "nurse", "v2_static", ("risk",), "../", True),
    DashboardSpec("version 2.0/unihealth-icu.html", "nurse", "v2_static", ("risk",), "../", True),
    DashboardSpec("version 2.0/unihealth-surgery.html", "doctor", "v2_static", ("risk",), "../", True),
    DashboardSpec("version 2.0/unihealth-radiology.html", "lab", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-billing.html", "admin", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-insurance.html", "admin", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-analytics.html", "admin", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-hr.html", "admin", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-inventory.html", "admin", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-fleet.html", "admin", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-mortuary.html", "admin", "v2_static", ("admin",), "../", True),
    DashboardSpec("version 2.0/unihealth-rehab.html", "nurse", "v2_static", ("risk",), "../", True),
    DashboardSpec("version 2.0/unihealth-nutrition.html", "nurse", "v2_static", ("risk",), "../", True),
    DashboardSpec("version 2.0/unihealth-teleconsult.html", "doctor", "v2_static", ("risk",), "../", True),
    DashboardSpec("version 2.0/unihealth-research.html", "admin", "v2_static", ("admin",), "../", True),
]

BODY_ATTRS = 'data-unihealth-ai-role="{role}" data-uh-patient-id="P001" data-uh-api="http://localhost:8100"'
RISK_MOUNT = '<div data-uh-ai="risk"></div>'
ADMIN_MOUNT = '<div data-uh-ai="admin-status"></div>'
PATIENT_WIDGET_START = (
    '<div class="ai-widget green" data-uh-ai="patient-insights" id="uh-ai-patient-widget">\n'
    '  <div data-uh-ai-live="insights" id="uh-ai-patient-insights-body"></div>\n'
    '  <div data-uh-ai-live="alerts" id="uh-ai-patient-alerts"></div>\n'
)


def mirror_css_to_react() -> None:
    if HTML_CSS.exists() and REACT_CSS.parent.exists():
        shutil.copy2(HTML_CSS, REACT_CSS)
        print("  mirrored: ai-assist-dashboard.css → frontend/app/src/styles/")


def ensure_assets(text: str, spec: DashboardSpec) -> str:
    css_href = f'{spec.asset_prefix}ai-assist-dashboard.css'
    js_src = f'{spec.asset_prefix}ai-assist-dashboard.js'
    if css_href not in text:
        if '<link rel="stylesheet" href="brand.css" />' in text:
            text = text.replace(
                '<link rel="stylesheet" href="brand.css" />',
                '<link rel="stylesheet" href="brand.css" />\n'
                f'    <link rel="stylesheet" href="{css_href}" />',
                1,
            )
        elif "</head>" in text:
            text = text.replace(
                "</head>",
                f'    <link rel="stylesheet" href="{css_href}" />\n</head>',
                1,
            )
    if js_src not in text and "</body>" in text:
        text = text.replace(
            "</body>",
            f'    <script src="{js_src}"></script>\n</body>',
            1,
        )
    return text


def ensure_body(text: str, spec: DashboardSpec) -> str:
    attrs = BODY_ATTRS.format(role=spec.role)
    if spec.v2:
        attrs += ' data-uh-theme="v2"'
    if "data-unihealth-ai-role" in text:
        text = re.sub(r"<body[^>]*>", f"<body {attrs}>", text, count=1)
        return text
    return text.replace("<body>", f"<body {attrs}>", 1)


def ensure_risk_mount(text: str) -> str:
    text = text.replace('<div class="uh-ai-mount" data-uh-ai="risk"></div>', RISK_MOUNT)
    if RISK_MOUNT in text:
        return text
    markers = [
        ("<!-- AI Risk Card -->", RISK_MOUNT + "\n        "),
        ('<div class="ai-widget">', RISK_MOUNT + "\n                "),
        ('<div class="ai-widget teal">', RISK_MOUNT + "\n                "),
        ('<div class="ai-security-widget">', RISK_MOUNT + "\n                "),
    ]
    for needle, insert in markers:
        if needle in text and RISK_MOUNT not in text:
            text = text.replace(needle, insert + needle, 1)
            break
    if "getHomeHTML" in text and RISK_MOUNT not in text:
        text = text.replace(
            '<div class="sync-bar">',
            RISK_MOUNT + "\n                <div class=\"sync-bar\">",
            1,
        )
    if "getPatientHTML" in text and text.count(RISK_MOUNT) < 2:
        text = text.replace(
            'function getPatientHTML() {\n                return `\n                <div class="ph">',
            'function getPatientHTML() {\n                return `\n                ' + RISK_MOUNT + '\n                <div class="ph">',
            1,
        )
    return text


def ensure_admin_mount(text: str, spec: DashboardSpec) -> str:
    if ADMIN_MOUNT in text:
        return text
    if spec.mode == "static" and 'id="pg-overview"' in text:
        needle = '</div>\n\n      <!-- Quick actions -->'
        if needle in text:
            return text.replace(needle, f'</div>\n\n      {ADMIN_MOUNT}\n\n      <!-- Quick actions -->', 1)
    if "getOverviewHTML" in text:
        text = re.sub(
            r'(</div></div>)\s*(\n\s*<div class="qa)',
            r"\1\n                " + ADMIN_MOUNT + r"\2",
            text,
            count=1,
        )
    if spec.v2 and '<div class="content">' in text and ADMIN_MOUNT not in text:
        text = text.replace(
            '<div class="content">',
            f'<div class="content">\n    {ADMIN_MOUNT}',
            1,
        )
    if "getOverviewHTML" in text and "pharmacy" in spec.rel_path.lower():
        text = text.replace(
            '<div class="ai-security-widget">',
            ADMIN_MOUNT + "\n                <div class=\"ai-security-widget\">",
            1,
        )
    return text


def ensure_patient_widget(text: str) -> str:
    if 'data-uh-ai="patient-insights"' in text:
        text = re.sub(
            r'class="ai-widget green[^"]*"\s*(?:style="[^"]*"\s*)?(?:data-uh-ai="patient-insights"\s*)?id="uh-ai-patient-widget"',
            'class="ai-widget green" style="animation-delay:.1s" data-uh-ai="patient-insights" id="uh-ai-patient-widget"',
            text,
        )
        if 'data-uh-ai-live="insights"' not in text:
            text = text.replace(
                '<div id="uh-ai-patient-insights-body"></div>',
                '<div data-uh-ai-live="insights" id="uh-ai-patient-insights-body"></div>',
            )
        if 'data-uh-ai-live="alerts"' not in text:
            text = text.replace(
                '<div id="uh-ai-patient-alerts"></div>',
                '<div data-uh-ai-live="alerts" id="uh-ai-patient-alerts"></div>',
            )
        return text

    if "AI Health Insights" in text or "uh-ai-patient-widget" in text:
        return text

    if 'id="tp-overview"' in text and "My Health Summary" in text:
        text = text.replace(
            '<div class="tp show" id="tp-overview">',
            '<div class="tp show" id="tp-overview">\n  ' + PATIENT_WIDGET_START,
            1,
        )
        return text

    return text


def ensure_spa_hooks(text: str, spec: DashboardSpec) -> str:
    mount_all = "if (window.UniHealthAI) UniHealthAI.mountAll(document.getElementById('contentArea'));"
    patient_mount = "if (state.currentPage === 'home' && window.UniHealthAI) UniHealthAI.mountPatient();"

    if spec.mode != "spa":
        return text

    if spec.role == "patient":
        if "UniHealthAI.mountPatient" in text:
            return text
        return re.sub(
            r"(attachPageEvents\(\);\s*feather\.replace\(\);)\s*\n(\s*\})",
            r"\1\n                " + patient_mount + r"\n\2",
            text,
            count=1,
        )

    if mount_all in text:
        text = re.sub(
            r"\s+if \(window\.UniHealthAI\) UniHealthAI\.mountAll\(document\.getElementById\('contentArea'\)\);",
            "\n                " + mount_all,
            text,
        )
        return text

    if "renderPage" in text:
        return re.sub(
            r"(attachEvents\(\);\s*feather\.replace\(\);)",
            r"\1\n                " + mount_all,
            text,
            count=1,
        )
    if "renderCurrentPage" in text or "attachPageEvents" in text:
        return re.sub(
            r"(feather\.replace\(\);)\s*\n(\s*\})",
            r"\1\n                " + mount_all + r"\n\2",
            text,
            count=1,
        )
    return text


def sync_file(spec: DashboardSpec) -> bool:
    path = FRONTEND / spec.rel_path
    if not path.exists():
        print(f"  skip (missing): {spec.rel_path}")
        return False
    original = path.read_text(encoding="utf-8")
    text = original
    text = ensure_assets(text, spec)
    text = ensure_body(text, spec)
    if "risk" in spec.mounts:
        text = ensure_risk_mount(text)
    if "admin" in spec.mounts:
        text = ensure_admin_mount(text, spec)
    if "patient" in spec.mounts:
        text = ensure_patient_widget(text)
    text = ensure_spa_hooks(text, spec)
    if text != original:
        path.write_text(text, encoding="utf-8")
        print(f"  updated: {spec.rel_path}")
        return True
    print(f"  ok: {spec.rel_path}")
    return False


def main() -> int:
    print("Syncing AI Assist across all HTML dashboards…")
    mirror_css_to_react()
    changed = sum(1 for spec in DASHBOARDS if sync_file(spec))
    print(f"Done. {changed} HTML file(s) updated.")
    print("React parity: /dashboard/doctor|nurse|patient|admin|lab|pharmacy")
    return 0


if __name__ == "__main__":
    sys.exit(main())
