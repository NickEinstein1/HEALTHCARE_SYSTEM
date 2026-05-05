import time

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.state import KMHFL_TTL_S, kmhfl_base_url, kmhfl_cache

router = APIRouter()


@router.get("/integrations/kmhfl/facilities", status_code=200, summary="Proxy Kenya KMHFL facilities with caching.")
async def kmhfl_facilities(
    search: str | None = Query(default=None),
    name: str | None = Query(default=None),
    code: str | None = Query(default=None, description="Comma-separated facility codes"),
    is_published: bool | None = Query(default=True),
    is_classified: bool | None = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    page: int = Query(default=1, ge=1, le=5000),
):
    base = kmhfl_base_url()
    url = f"{base}/api/facilities/facilities/"
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

    key = f"{url}?{sorted(params.items())}"
    now = time.time()
    cached = kmhfl_cache.get(key)
    if cached and (now - cached[0]) < KMHFL_TTL_S:
        return {"source": "kmhfl", "cached": True, "base_url": base, **cached[1]}

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params, headers={"Accept": "application/json"})
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"KMHFL fetch failed: {e}")

    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"KMHFL returned {resp.status_code}: {resp.text[:400]}")

    data = resp.json()
    if not isinstance(data, dict):
        data = {"results": data}
    kmhfl_cache[key] = (now, data)
    return {"source": "kmhfl", "cached": False, "base_url": base, **data}

