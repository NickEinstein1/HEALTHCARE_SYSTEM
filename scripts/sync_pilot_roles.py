#!/usr/bin/env python3
"""
Sync pilot roles across React, v2 HTML auth portals, Keycloak, and module pull.

Source of truth: shared/pilot-roles.json

  python3 scripts/sync_pilot_roles.py          # apply HTML patches + validate
  python3 scripts/sync_pilot_roles.py --check  # validate only (CI)
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "shared" / "pilot-roles.json"
REALM_PATH = ROOT / "infra" / "keycloak" / "realm-unihealth.json"
V2 = ROOT / "frontend" / "version 2.0"

MARKER_ROLES = ("/* PILOT_ROLES_ARRAY_START */", "/* PILOT_ROLES_ARRAY_END */")
MARKER_PULL = ("/* PILOT_MODULE_PULL_START */", "/* PILOT_MODULE_PULL_END */")
MARKER_QUICK = ("<!-- PILOT_QUICK_ACCESS_START -->", "<!-- PILOT_QUICK_ACCESS_END -->")
MARKER_RD = ("<!-- PILOT_RD_LIST_START -->", "<!-- PILOT_RD_LIST_END -->")
MARKER_REDIRECT = ("/* PILOT_REDIRECT_MAP_START */", "/* PILOT_REDIRECT_MAP_END */")


def load_config() -> dict:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def replace_block(text: str, start: str, end: str, body: str) -> str:
    pattern = re.escape(start) + r".*?" + re.escape(end)
    replacement = f"{start}\n{body}\n{end}"
    if not re.search(pattern, text, flags=re.DOTALL):
        raise ValueError(f"Markers not found: {start} … {end}")
    return re.sub(pattern, replacement, text, count=1, flags=re.DOTALL)


def js_roles_array(cfg: dict) -> str:
    lines = ["const ROLES = ["]
    tag_meta = {
        "doctor": ("Core", "tag-g"),
        "nurse": ("Core", "tag-g"),
        "lab": ("Core", "tag-g"),
        "pharmacy": ("Core", "tag-g"),
        "billing": ("Finance", "tag-y"),
        "admin": ("Admin", "tag-r"),
        "patient": ("Patient", "tag-b"),
    }
    for role in cfg["roles"]:
        rid = role["id"]
        tag, tag_class = tag_meta.get(rid, ("Core", "tag-g"))
        lines.append("  {")
        lines.append(f"    id:'{rid}', icon:'{role['icon']}', name:'{role['label']}',")
        lines.append(f"    desc:'{role['portalDesc']}',")
        lines.append(f"    mods:'{role['portalTitle']} · Module Pull',")
        lines.append(f"    stats:'Pilot account · Keycloak username {role['keycloakUsername']}',")
        lines.append(f"    tag:'{tag}', tagClass:'{tag_class}'")
        lines.append("  },")
    lines.append("];")
    return "\n".join(lines)


def js_module_pull(cfg: dict) -> str:
    lines = ["function getModulesForRole(roleId) {", "  const registry = {"]
    for rid, mods in cfg["modulePullIds"].items():
        quoted = ",".join(f"'{m}'" for m in mods)
        lines.append(f"    {rid}: [{quoted}],")
    lines.append("  };")
    lines.append("  return registry[roleId] || ['emr'];")
    lines.append("}")
    return "\n".join(lines)


def html_quick_access(cfg: dict) -> str:
    lines = []
    for role in cfg["roles"]:
        href = role["v2HtmlPath"]
        lines.append(
            f'    <a href="{href}" style="padding:10px 12px;background:rgba(5,12,7,.95);'
            f'border:1px solid var(--bd);border-radius:10px;text-decoration:none;'
            f'display:flex;align-items:center;gap:8px;transition:all .2s;font-size:.82rem;color:var(--t2)">'
            f'<span>{role["icon"]}</span> {role["label"]} · Get access</a>'
        )
    return "\n".join(lines)


def html_rd_list(cfg: dict) -> str:
    groups = {
        "Clinical Staff": ["doctor", "nurse", "lab", "pharmacy"],
        "Administration & Patients": ["admin", "patient"],
    }
    lines = []
    icons = {
        "doctor": "stethoscope",
        "nurse": "heart",
        "lab": "droplet",
        "pharmacy": "package",
        "admin": "shield",
        "patient": "user",
    }
    for group, ids in groups.items():
        lines.append(f'    <div class="rd-grp">{group}</div>')
        for rid in ids:
            role = next(r for r in cfg["roles"] if r["id"] == rid)
            lines.append(
                f'    <button class="rd-it" data-role="{rid}" data-icon="{icons[rid]}" '
                f'data-name="{role["label"]}" type="button" role="option">'
                f'<div class="rd-ic"><i data-feather="{icons[rid]}"></i></div>'
                f'<div class="rd-info"><div class="rd-nm">{role["label"]}</div>'
                f'<div class="rd-ds">{role["signInDesc"]}</div></div>'
                f'<div class="rd-chk"><i data-feather="check"></i></div></button>'
            )
    return "\n".join(lines)


def js_redirect_map(cfg: dict) -> str:
    pairs = [f"{r['id']}:'{r['v2HtmlPath']}'" for r in cfg["roles"]]
    inner = ",".join(pairs)
    return f"const d={{{inner}}};"


def validate_keycloak(cfg: dict) -> list[str]:
    errors: list[str] = []
    realm = json.loads(REALM_PATH.read_text(encoding="utf-8"))
    realm_roles = {r["name"] for r in realm.get("roles", {}).get("realm", [])}
    users = {u["username"]: u for u in realm.get("users", [])}
    for role in cfg["roles"]:
        rid = role["id"]
        if rid not in realm_roles:
            errors.append(f"Keycloak missing realm role: {rid}")
        user = users.get(role["keycloakUsername"])
        if not user:
            errors.append(f"Keycloak missing user: {role['keycloakUsername']}")
        elif rid not in (user.get("realmRoles") or []):
            errors.append(f"Keycloak user {role['keycloakUsername']} missing role {rid}")
    return errors


def patch_file(path: Path, transforms: list[tuple[str, str, str]]) -> None:
    text = path.read_text(encoding="utf-8")
    for start, end, body in transforms:
        text = replace_block(text, start, end, body)
    path.write_text(text, encoding="utf-8")
    print(f"patched {path.relative_to(ROOT)}")


def ensure_markers(path: Path, blocks: list[tuple[str, str, str]]) -> None:
    """Insert markers around legacy content on first run."""
    text = path.read_text(encoding="utf-8")
    changed = False
    for start, end, _ in blocks:
        if start in text:
            continue
        # caller must pre-insert markers manually for first-time files
        raise SystemExit(
            f"Missing sync markers in {path}. Run once with pre-tagged files or add markers manually."
        )
    if changed:
        path.write_text(text, encoding="utf-8")


def apply_patches(cfg: dict) -> None:
    auth_v2 = V2 / "unihealth360-auth-portal-v2.html"
    patch_file(
        auth_v2,
        [
            (MARKER_ROLES[0], MARKER_ROLES[1], js_roles_array(cfg)),
            (MARKER_PULL[0], MARKER_PULL[1], js_module_pull(cfg)),
        ],
    )

    index_html = V2 / "index.html"
    patch_file(index_html, [(MARKER_QUICK[0], MARKER_QUICK[1], html_quick_access(cfg))])

    final_html = V2 / "unihealth360-final.html"
    patch_file(
        final_html,
        [
            (MARKER_RD[0], MARKER_RD[1], html_rd_list(cfg)),
            (MARKER_REDIRECT[0], MARKER_REDIRECT[1], js_redirect_map(cfg)),
        ],
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Validate only; do not write HTML")
    args = parser.parse_args()

    if not CONFIG_PATH.exists():
        print(f"Missing {CONFIG_PATH}", file=sys.stderr)
        return 1

    cfg = load_config()
    errors = validate_keycloak(cfg)

    role_ids = {r["id"] for r in cfg["roles"]}
    for role in cfg["signInOrder"]:
        if role not in role_ids:
            errors.append(f"signInOrder references unknown role: {role}")
    for role in cfg["landingOrder"]:
        if role not in role_ids:
            errors.append(f"landingOrder references unknown role: {role}")
    for role, mods in cfg["modulePullIds"].items():
        if role not in role_ids:
            errors.append(f"modulePullIds references unknown role: {role}")

    if errors:
        for e in errors:
            print(f"ERROR: {e}", file=sys.stderr)
        return 1

    print(f"OK: {len(cfg['roles'])} pilot roles validated (Keycloak + React)")

    if args.check:
        return 0

    apply_patches(cfg)
    print("Pilot role sync complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
