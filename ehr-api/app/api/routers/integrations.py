import os
import time

from fastapi import APIRouter, HTTPException, Query

from app.kmhfl_client import fetch_kmhfl_facilities, kmhfl_base_url
from app.state import KMHFL_TTL_S, kmhfl_cache

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
    params_key = {
        "search": search,
        "name": name,
        "code": code,
        "is_published": is_published,
        "is_classified": is_classified,
        "limit": limit,
        "page": page,
    }
    key = f"{base}?{sorted((k, str(v)) for k, v in params_key.items())}"
    now = time.time()
    cached = kmhfl_cache.get(key)
    if cached and (now - cached[0]) < KMHFL_TTL_S:
        return {"source": "kmhfl", "cached": True, "base_url": base, **cached[1]}

    try:
        data = await fetch_kmhfl_facilities(
            search=search,
            name=name,
            code=code,
            is_published=is_published,
            is_classified=is_classified,
            limit=limit,
            page=page,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"KMHFL fetch failed: {e}") from e

    source = "kmhfl-demo" if data.get("demo_fallback") else "kmhfl"
    kmhfl_cache[key] = (now, data)
    return {
        "source": source,
        "cached": False,
        "base_url": base,
        "auth_configured": bool(
            (os.getenv("KMHFL_API_TOKEN") or "").strip()
            or ((os.getenv("KMHFL_USERNAME") or "").strip() and (os.getenv("KMHFL_PASSWORD") or "").strip())
        ),
        **data,
    }
