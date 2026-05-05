from __future__ import annotations

import time
from collections import defaultdict

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/metrics")

_metrics = defaultdict(
    lambda: {"requests": 0, "latency_ms_sum": 0.0, "latency_ms_min": None, "latency_ms_max": None}
)


def record(method: str, path: str, latency_ms: float) -> None:
    key = f"{method.upper()} {path}"
    row = _metrics[key]
    row["requests"] += 1
    row["latency_ms_sum"] += float(latency_ms)
    row["latency_ms_min"] = latency_ms if row["latency_ms_min"] is None else min(row["latency_ms_min"], latency_ms)
    row["latency_ms_max"] = latency_ms if row["latency_ms_max"] is None else max(row["latency_ms_max"], latency_ms)


@router.get("/json", summary="Simple in-memory metrics (Phase 1)")
async def metrics_json():
    routes = []
    for k, v in _metrics.items():
        avg = round(v["latency_ms_sum"] / v["requests"], 2) if v["requests"] else 0.0
        method, path = k.split(" ", 1)
        routes.append(
            {
                "method": method,
                "path": path,
                "requests": v["requests"],
                "avg_latency_ms": avg,
                "min_latency_ms": v["latency_ms_min"] or 0,
                "max_latency_ms": v["latency_ms_max"] or 0,
            }
        )
    return {"ts": time.time(), "routes": sorted(routes, key=lambda r: r["requests"], reverse=True)}


@router.get("/prometheus", response_class=PlainTextResponse, summary="Prometheus-style metrics")
async def metrics_prom():
    lines = ["# HELP unihealth_requests_total Total requests by route", "# TYPE unihealth_requests_total counter"]
    for k, v in _metrics.items():
        method, path = k.split(" ", 1)
        safe_path = path.replace('"', '\\"')
        lines.append(f'unihealth_requests_total{{method="{method}",path="{safe_path}"}} {v["requests"]}')
    return "\n".join(lines) + "\n"


async def middleware_capture(request: Request, call_next):
    start = time.perf_counter()
    resp = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000.0
    record(request.method, request.url.path, elapsed_ms)
    return resp

