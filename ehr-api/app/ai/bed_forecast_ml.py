"""
Occupancy forecasting — supervised linear model on diurnal + autoregressive features.

No external sci‑Py stack: closed-form Normal Equations solved via Gaussian elimination.
Trained primarily on **persisted hourly ward census** when available (see
``ward_occ_history``); otherwise falls back to a short synthetic bootstrap series.

Forecast kind: ``ols_diurnal_autoreg_v1`` with optional fallback to heuristic sine-wave.
"""

from __future__ import annotations

import math
import random
import time
from typing import Any

MODEL_KIND = "ols_diurnal_autoreg_v1"
MIN_SNAPSHOTS_TRAIN = 32
MAX_HISTORY_POINTS = 168


def extract_training_series_from_snapshots(
    snapshots: list[dict],
    capacity: int,
    *,
    max_points: int = MAX_HISTORY_POINTS,
) -> tuple[list[int], float] | None:
    """
    Sort by ``ts_epoch``, take the last ``max_points`` hourly census rows, return
    occupancy ints + epoch of first training step (for diurnal features).
    """
    if len(snapshots) < MIN_SNAPSHOTS_TRAIN:
        return None
    cap = max(1, int(capacity))
    rows = sorted(
        (r for r in snapshots if isinstance(r.get("ts_epoch"), (int, float))),
        key=lambda r: float(r["ts_epoch"]),
    )
    if len(rows) < MIN_SNAPSHOTS_TRAIN:
        return None
    tail = rows[-max_points:]
    series = [max(0, min(cap, int(r.get("occupied", 0)))) for r in tail]
    start_epoch = float(tail[0]["ts_epoch"])
    return series, start_epoch


def _build_hourly_occ_series(
    occ_now: int,
    capacity: int,
    rng: random.Random,
    *,
    history_hours: int = 168,
) -> tuple[list[int], float]:
    """
    Synthetic hourly occupancy ending at ``occ_now``.

    Returns ``(series, start_epoch)`` where ``start_epoch`` is Unix time of series[0].
    """
    cap_i = max(1, capacity)
    start_occ = rng.uniform(cap_i * 0.22, cap_i * 0.88)
    occ = float(start_occ)
    ser_f: list[float] = []
    start_epoch = time.time() - history_hours * 3600
    for t in range(history_hours):
        hod = time.localtime(start_epoch + t * 3600).tm_hour
        seasonal = math.sin(math.pi * (hod - 10) / 12.0) * cap_i * 0.038
        occ = occ + seasonal + rng.gauss(0, max(1.4, cap_i * 0.032))
        occ = occ * 0.985 + rng.uniform(cap_i * 0.42, cap_i * 0.94) * 0.015
        occ = max(0.0, min(cap_i * 1.03, occ))
        ser_f.append(occ)

    normed = [max(0, min(capacity, round(x))) for x in ser_f]
    normed[-1] = max(0, min(capacity, occ_now))
    return normed, start_epoch


def _solve_4(A: list[list[float]], b: list[float]) -> list[float] | None:
    """Gaussian elimination with partial pivot; A is 4x4, solves A x = b."""
    n = 4
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(M[r][col]))
        if abs(M[piv][col]) < 1e-12:
            return None
        M[col], M[piv] = M[piv], M[col]
        div = M[col][col]
        for j in range(col, n + 1):
            M[col][j] /= div
        for r in range(n):
            if r == col:
                continue
            factor = M[r][col]
            if factor == 0:
                continue
            for j in range(col, n + 1):
                M[r][j] -= factor * M[col][j]
    return [M[i][n] for i in range(n)]


def _fit_theta(series: list[int], start_epoch: float) -> tuple[list[float] | None, float]:
    """
    Features at time t predicting occ[t+1]:
      x = [1, sin(h), cos(h), occ[t]]

    Hours h use local wall-clock hour for each historical step.
    """
    if len(series) < 32:
        return None, 0.0

    Xrows: list[list[float]] = []
    y_vals: list[float] = []

    for t in range(len(series) - 1):
        hr = time.localtime(start_epoch + t * 3600).tm_hour
        angle = 2 * math.pi * hr / 24
        xt = series[t]
        Xrows.append([1.0, math.sin(angle), math.cos(angle), float(xt)])
        y_vals.append(float(series[t + 1]))

    if len(y_vals) < 24:
        return None, 0.0

    XtX = [[0.0] * 4 for _ in range(4)]
    Xty = [0.0] * 4
    for i in range(len(Xrows)):
        row = Xrows[i]
        yi = y_vals[i]
        for a in range(4):
            Xty[a] += row[a] * yi
            for b_idx in range(4):
                XtX[a][b_idx] += row[a] * row[b_idx]

    theta = _solve_4(XtX, Xty)
    if theta is None:
        return None, 0.0

    # training RMSE
    se = 0.0
    for i in range(len(Xrows)):
        pred = sum(theta[j] * Xrows[i][j] for j in range(4))
        se += (pred - y_vals[i]) ** 2
    rmse = math.sqrt(se / max(1, len(y_vals)))
    return theta, rmse


def _heuristic_steps(
    ward_id: str,
    base: int,
    cap: int,
    rng: random.Random,
    hours: int,
) -> list[dict]:
    """Legacy sine+noise fallback (same spirit as old build_bed_forecast)."""
    steps: list[dict] = []
    now_ts = time.time()
    for h in range(min(hours, 49)):
        ts = now_ts + h * 3600
        hod = int(time.localtime(ts).tm_hour)
        sine_factor = 0.15 * math.sin(math.pi * (hod - 4) / 12)
        noise = rng.gauss(0, 0.65)
        pred = max(0, min(cap, round(base + base * sine_factor + noise)))
        pct = round(pred / cap * 100, 1)
        steps.append({
            "ts":        time.strftime("%Y-%m-%d %H:%M", time.localtime(ts)),
            "hour":      hod,
            "predicted": pred,
            "capacity":  cap,
            "pct":       pct,
            "status":    "CRITICAL" if pred / cap > 0.9 else "WARNING" if pred / cap > 0.75 else "OK",
        })
    if steps:
        steps[0]["forecast_meta"] = {
            "ward_id": ward_id,
            "model": "heuristic_diurnal_fallback",
            "rmse_estimate_beds": None,
            "trainer_n": len(steps),
        }
    return steps


def build_ml_forecast_for_ward(
    ward_id: str,
    ws: dict[str, Any],
    rng: random.Random,
    *,
    hours: int = 49,
    history_hours: int = 168,
    history_snapshots: list[dict] | None = None,
) -> list[dict]:
    """Return hourly forecast rows including optional ``forecast_meta`` on first row."""
    cap = int(ws.get("capacity", 1))
    base = max(0, min(cap, int(ws.get("occupied", 0))))

    training_source = "synthetic_bootstrap"
    series: list[int]
    train_start_epoch: float

    extracted = None
    if history_snapshots:
        extracted = extract_training_series_from_snapshots(
            history_snapshots, cap, max_points=history_hours,
        )
    if extracted:
        series, train_start_epoch = extracted
        training_source = "persisted_census"
        if series:
            series[-1] = base
    else:
        series, train_start_epoch = _build_hourly_occ_series(base, cap, rng, history_hours=history_hours)

    theta, train_rmse = _fit_theta(series, train_start_epoch)

    now_ts = time.time()
    steps: list[dict] = []

    if theta is None:
        return _heuristic_steps(ward_id, base, cap, rng, hours)

    train_end_epoch = train_start_epoch + (len(series) - 1) * 3600
    occ = float(series[-1])
    horizon = min(hours, 49)

    for h in range(horizon):
        ts = now_ts + h * 3600
        hod = int(time.localtime(ts).tm_hour)
        hr_ref = train_end_epoch + h * 3600
        angle = 2 * math.pi * time.localtime(hr_ref).tm_hour / 24
        feats = [1.0, math.sin(angle), math.cos(angle), occ]
        raw = sum(theta[j] * feats[j] for j in range(4))
        pred = max(0, min(cap, round(raw)))
        occ = float(pred)
        pct = round(pred / cap * 100, 1)
        steps.append({
            "ts":        time.strftime("%Y-%m-%d %H:%M", time.localtime(ts)),
            "hour":      hod,
            "predicted": pred,
            "capacity":  cap,
            "pct":       pct,
            "status":    "CRITICAL" if pred / cap > 0.9 else "WARNING" if pred / cap > 0.75 else "OK",
        })

    meta = {
        "ward_id":           ward_id,
        "model":             MODEL_KIND,
        "training_source":   training_source,
        "history_points":    len(history_snapshots or []),
        "rmse_estimate_beds": round(train_rmse, 3),
        "trainer_n":         len(series) - 1,
        "features":          ["bias", "sin(h)", "cos(h)", "occ_lag_1"],
    }
    if steps:
        steps[0]["forecast_meta"] = meta
    return steps


def build_ml_forecast_all(
    ward_state: dict[str, dict],
    rng: random.Random,
    ward_histories: dict[str, list[dict]] | None = None,
) -> dict[str, list[dict]]:
    wh = ward_histories or {}
    out: dict[str, list[dict]] = {}
    for wid, ws in ward_state.items():
        out[wid] = build_ml_forecast_for_ward(
            wid, ws, rng,
            hours=49,
            history_snapshots=wh.get(wid),
        )
    return out
