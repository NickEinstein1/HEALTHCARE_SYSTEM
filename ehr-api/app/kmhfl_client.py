"""Kenya Master Health Facility List (KMHFL / KMHFR) API client."""

from __future__ import annotations

import os
import time
from typing import Any
from urllib.parse import urlparse

import httpx

# MOH migrated public UI to kmhfr.health.go.ke; REST API is on api.kmhfr.health.go.ke
DEFAULT_KMHFL_API_BASE = "https://api.kmhfr.health.go.ke"

_token_cache: tuple[str, float] | None = None
_TOKEN_TTL_S = 3600.0

_DEMO_FACILITIES: list[dict[str, Any]] = [
    {
        "id": "demo-kenyatta",
        "name": "Kenyatta National Hospital",
        "code": "100001",
        "county": "Nairobi",
        "facility_type": {"name": "Level 6 Hospital"},
        "keph_level_name": "Level 6",
        "operation_status_name": "Operational",
    },
    {
        "id": "demo-moi-teaching",
        "name": "Moi Teaching and Referral Hospital",
        "code": "100045",
        "county": "Uasin Gishu",
        "facility_type": {"name": "Level 6 Hospital"},
        "keph_level_name": "Level 6",
        "operation_status_name": "Operational",
    },
    {
        "id": "demo-aga-khan",
        "name": "Aga Khan University Hospital Nairobi",
        "code": "100112",
        "county": "Nairobi",
        "facility_type": {"name": "Level 5 Hospital"},
        "keph_level_name": "Level 5",
        "operation_status_name": "Operational",
    },
    {
        "id": "demo-pumwani",
        "name": "Pumwani Maternity Hospital",
        "code": "100089",
        "county": "Nairobi",
        "facility_type": {"name": "Level 5 Hospital"},
        "keph_level_name": "Level 5",
        "operation_status_name": "Operational",
    },
    {
        "id": "demo-kisumu",
        "name": "Jaramogi Oginga Odinga Teaching & Referral Hospital",
        "code": "100201",
        "county": "Kisumu",
        "facility_type": {"name": "Level 5 Hospital"},
        "keph_level_name": "Level 5",
        "operation_status_name": "Operational",
    },
    {
        "id": "demo-coast",
        "name": "Coast General Teaching and Referral Hospital",
        "code": "100178",
        "county": "Mombasa",
        "facility_type": {"name": "Level 5 Hospital"},
        "keph_level_name": "Level 5",
        "operation_status_name": "Operational",
    },
    {
        "id": "demo-nakuru",
        "name": "Nakuru Level 5 Hospital",
        "code": "100156",
        "county": "Nakuru",
        "facility_type": {"name": "Level 5 Hospital"},
        "keph_level_name": "Level 5",
        "operation_status_name": "Operational",
    },
    {
        "id": "demo-machakos",
        "name": "Machakos Level 5 Hospital",
        "code": "100134",
        "county": "Machakos",
        "facility_type": {"name": "Level 5 Hospital"},
        "keph_level_name": "Level 5",
        "operation_status_name": "Operational",
    },
]


def kmhfl_base_url() -> str:
    raw = (os.getenv("KMHFL_BASE_URL") or DEFAULT_KMHFL_API_BASE).strip().rstrip("/")
    # Legacy hostname redirects to Next.js UI (404 on /api/...) — normalize to API host
    if "kmhfl.health.go.ke" in raw and "api." not in raw:
        return DEFAULT_KMHFL_API_BASE
    if raw.endswith("kmhfr.health.go.ke") and not raw.startswith("https://api."):
        return DEFAULT_KMHFL_API_BASE
    return raw


def kmhfl_use_demo_fallback() -> bool:
    return os.getenv("KMHFL_USE_DEMO_FALLBACK", "true").strip().lower() in ("1", "true", "yes")


def _demo_response(
    *,
    search: str | None,
    page: int,
    limit: int,
    reason: str,
) -> dict[str, Any]:
    q = (search or "").strip().lower()
    rows = _DEMO_FACILITIES
    if q:
        rows = [
            r
            for r in rows
            if q in str(r.get("name", "")).lower()
            or q in str(r.get("code", "")).lower()
            or q in str(r.get("county", "")).lower()
        ]
    start = (page - 1) * limit
    end = start + limit
    page_rows = rows[start:end]
    next_page = page + 1 if end < len(rows) else None
    return {
        "count": len(rows),
        "next": f"demo:page={next_page}" if next_page else None,
        "previous": f"demo:page={page - 1}" if page > 1 else None,
        "results": page_rows,
        "demo_fallback": True,
        "fallback_reason": reason,
    }


async def _login_token(base: str, username: str, password: str) -> str:
    global _token_cache
    now = time.time()
    if _token_cache and (now - _token_cache[1]) < _TOKEN_TTL_S:
        return _token_cache[0]

    url = f"{base}/api/rest-auth/login/"
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            url,
            json={"username": username, "password": password},
            headers={"Accept": "application/json", "Content-Type": "application/json"},
        )
    if resp.status_code >= 400:
        raise RuntimeError(f"KMHFL login failed ({resp.status_code}): {resp.text[:200]}")
    data = resp.json()
    key = data.get("key") if isinstance(data, dict) else None
    if not key:
        raise RuntimeError("KMHFL login response missing token key")
    _token_cache = (str(key), now)
    return str(key)


async def _auth_headers(base: str) -> dict[str, str]:
    token = (os.getenv("KMHFL_API_TOKEN") or "").strip()
    if token:
        return {"Authorization": f"Token {token}", "Accept": "application/json"}

    user = (os.getenv("KMHFL_USERNAME") or "").strip()
    password = (os.getenv("KMHFL_PASSWORD") or "").strip()
    if user and password:
        key = await _login_token(base, user, password)
        return {"Authorization": f"Token {key}", "Accept": "application/json"}

    return {"Accept": "application/json"}


def _normalize_facilities_url(base: str) -> str:
    """Ensure trailing slash on list endpoint (Django REST)."""
    return f"{base.rstrip('/')}/api/facilities/facilities/"


async def fetch_kmhfl_facilities(
    *,
    search: str | None = None,
    name: str | None = None,
    code: str | None = None,
    is_published: bool | None = True,
    is_classified: bool | None = False,
    limit: int = 50,
    page: int = 1,
) -> dict[str, Any]:
    base = kmhfl_base_url()
    url = _normalize_facilities_url(base)
    params: dict[str, str] = {"page": str(page), "page_size": str(limit)}
    if search:
        params["search"] = search
    if name:
        params["name"] = name
    if code:
        params["code"] = code
    if is_published is not None:
        params["is_published"] = "true" if is_published else "false"
    if is_classified is not None:
        params["is_classified"] = "true" if is_classified else "false"

    headers = await _auth_headers(base)
    has_auth = "Authorization" in headers

    try:
        async with httpx.AsyncClient(timeout=25.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params, headers=headers)
    except Exception as e:
        if kmhfl_use_demo_fallback():
            return _demo_response(search=search or name, page=page, limit=limit, reason=f"network_error: {e}")
        raise

    # Follow legacy redirect once and retry on API host if HTML 404
    if resp.status_code == 404 and "text/html" in (resp.headers.get("content-type") or ""):
        api_base = DEFAULT_KMHFL_API_BASE
        if urlparse(str(resp.url)).netloc != urlparse(api_base).netloc:
            url2 = _normalize_facilities_url(api_base)
            headers2 = await _auth_headers(api_base)
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.get(url2, params=params, headers=headers2)

    if resp.status_code == 401 and not has_auth and kmhfl_use_demo_fallback():
        return _demo_response(
            search=search or name,
            page=page,
            limit=limit,
            reason="api_requires_token_set_KMHFL_API_TOKEN_or_KMHFL_USERNAME_PASSWORD",
        )

    if resp.status_code >= 400:
        if kmhfl_use_demo_fallback() and resp.status_code in (401, 403, 404, 502, 503):
            return _demo_response(
                search=search or name,
                page=page,
                limit=limit,
                reason=f"upstream_{resp.status_code}",
            )
        raise RuntimeError(f"KMHFL returned {resp.status_code}: {resp.text[:400]}")

    data = resp.json()
    if not isinstance(data, dict):
        data = {"results": data}
    data["demo_fallback"] = False
    return data
