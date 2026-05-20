#!/usr/bin/env python3
"""Update legacy frontend HTML prototypes with UniHealth SVG branding."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OPEN = "<div"
CLOSE = "</div>"

BRAND_SB = '<img src="brand-mark.svg" alt="" class="uh-brand uh-brand--sb" />'
BRAND_NI = '<img src="brand-mark.svg" alt="" class="uh-brand uh-brand--ni" />'
BRAND_KPI = '<img src="brand-mark.svg" alt="" class="uh-brand uh-brand--kpi" />'
BRAND_QA = '<img src="brand-mark.svg" alt="" class="uh-brand uh-brand--qa" />'
BRAND_CONSENT = '<img src="brand-mark.svg" alt="" class="uh-brand uh-brand--consent" />'
BRAND_INLINE = '<img src="brand-mark.svg" alt="" class="uh-brand uh-brand--inline" />'
BRAND_REP = '<img src="brand-mark.svg" alt="" class="uh-brand uh-brand--rep" />'
BRAND_SIGNIN = '<img src="brand-mark.svg" alt="" class="uh-brand uh-brand--signin" />'
HOSPITAL = "\U0001f3e5"
PEOPLE = "\U0001f465"

HEAD_LINKS = (
    '<link rel="icon" type="image/svg+xml" href="brand-mark.svg" />\n'
    '    <link rel="stylesheet" href="brand.css" />'
)


def patch_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    orig = text

    if "brand.css" not in text and "<head>" in text:
        text = text.replace("<head>", f"<head>\n    {HEAD_LINKS}", 1)

    text = text.replace("UniHealth EHR", "UniHealth")
    text = text.replace("Model National Health System", "Innovation at its core")

    text = text.replace(
        f'{OPEN} class="sb-ico">{HOSPITAL}{CLOSE}',
        f'{OPEN} class="sb-ico" aria-hidden="true">{BRAND_SB}{CLOSE}',
    )
    text = re.sub(
        OPEN + r' class="sb-ico">\s*<i data-feather="[^"]+"[^>]*>\s*</i>\s*' + CLOSE,
        f'{OPEN} class="sb-ico" aria-hidden="true">{BRAND_SB}{CLOSE}',
        text,
        flags=re.S,
    )
    text = re.sub(
        OPEN + r' class="brand-sq"[^>]*>\s*<i data-feather="[^"]+"[^>]*>\s*</i>\s*' + CLOSE,
        f'{OPEN} class="brand-sq" aria-hidden="true">{BRAND_SIGNIN}{CLOSE}',
        text,
        flags=re.S,
    )

    text = text.replace(
        '<span class="ni-ico">🏥</span><span class="ni-lbl">Facilities</span>',
        f'<span class="ni-ico">{BRAND_NI}</span><span class="ni-lbl">Facilities</span>',
    )
    text = text.replace(
        '<span class="ni-ico">🏥</span><span class="ni-lbl">Visit History</span>',
        '<span class="ni-ico">📋</span><span class="ni-lbl">Visit History</span>',
    )
    text = text.replace('<span class="qa-e">🏥</span>', f'<span class="qa-e">{BRAND_QA}</span>')
    text = text.replace(
        f'{OPEN} class="kpi-ico">{HOSPITAL}{CLOSE}{OPEN} class="kpi-lbl">Registered Patients{CLOSE}',
        f'{OPEN} class="kpi-ico">{PEOPLE}{CLOSE}{OPEN} class="kpi-lbl">Registered Patients{CLOSE}',
    )
    text = text.replace(
        f'{OPEN} class="kpi-ico">{HOSPITAL}{CLOSE}{OPEN} class="kpi-lbl">Facilities Online{CLOSE}',
        f'{OPEN} class="kpi-ico">{BRAND_KPI}{CLOSE}{OPEN} class="kpi-lbl">Facilities Online{CLOSE}',
    )
    text = text.replace('<span class="consent-ico">🏥</span>', f'<span class="consent-ico">{BRAND_CONSENT}</span>')
    text = text.replace(f"flex-shrink:0'>{HOSPITAL}{CLOSE}", f"flex-shrink:0'>{BRAND_INLINE}{CLOSE}")
    text = text.replace("ico:'🏥'", f"ico:'{BRAND_REP}'")
    text = text.replace('ico: "🏥"', 'ico: "📋"')
    text = text.replace("ico: '🏥'", "ico: '📋'")

    if text != orig:
        path.write_text(text, encoding="utf-8")
        return True
    return False


def main() -> None:
    changed = [p.name for p in sorted(ROOT.glob("*.html")) if patch_file(p)]
    print("Updated:", ", ".join(changed) if changed else "(none)")


if __name__ == "__main__":
    main()
