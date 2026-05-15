"""
Persisted hourly ward census snapshots for ML bed forecasting.

Ring buffer (max 720 ≈ 30 days hourly). Mutates ``app.state`` in-process.
"""

from __future__ import annotations

import logging
import random
import time

import app.state as st
from app.config import settings
from app.ai.bed_forecast_ml import build_ml_forecast_for_ward

_SNAPSHOT_RNG = random.Random(77)
MAX_SNAPSHOTS = 720
_log = logging.getLogger(__name__)


def append_ward_census_snapshot(
    ward_id: str,
    occupied: int,
    *,
    source: str = "api",
    ts_epoch: float | None = None,
) -> dict:
    """
    Record census (hour bucket), refresh ward rollup state, re-run forecast for ward.
    """
    ws = st.sim_ward_state.get(ward_id)
    if ws is None:
        raise ValueError(f"Unknown ward_id: {ward_id}")
    cap = int(ws["capacity"])
    occ = max(0, min(cap, int(occupied)))
    bucket = float(ts_epoch if ts_epoch is not None else (time.time() // 3600 * 3600))

    hist = st.sim_ward_occ_history.setdefault(ward_id, [])
    entry = {"ts_epoch": bucket, "occupied": occ, "capacity": cap, "source": source}
    if hist and int(float(hist[-1]["ts_epoch"])) == int(bucket):
        hist[-1] = entry
    else:
        hist.append(entry)

    st.sim_ward_occ_history[ward_id] = hist[-MAX_SNAPSHOTS:]

    ws["occupied"] = occ
    ws["available"] = cap - occ
    ws["pct"] = round(occ / cap * 100, 1) if cap else 0.0

    fc = build_ml_forecast_for_ward(
        ward_id,
        ws,
        _SNAPSHOT_RNG,
        history_snapshots=st.sim_ward_occ_history[ward_id],
    )
    st.sim_bed_forecast[ward_id] = fc

    meta = fc[0].get("forecast_meta") if fc else None
    sqlite_path = (settings.ward_census_sqlite_path or "").strip()
    if sqlite_path:
        try:
            from app.ai.sqlite_census_store import persist_census_snapshot as _persist_sqlite_row

            _persist_sqlite_row(
                sqlite_path,
                ward_id=ward_id,
                ts_epoch=bucket,
                occupied=occ,
                capacity=cap,
                source=source,
            )
        except Exception:
            _log.warning(
                "Could not persist ward census to SQLite; kept in-memory only.",
                exc_info=True,
            )

    return {
        "ward_id":         ward_id,
        "occupied":        occ,
        "capacity":        cap,
        "history_length":  len(st.sim_ward_occ_history[ward_id]),
        "forecast_meta":   meta,
    }


def recompute_all_forecasts() -> dict[str, str]:
    """Rebuild bed forecasts for every ward from current state + histories."""
    from app.ai.bed_forecast_ml import build_ml_forecast_all

    out = build_ml_forecast_all(st.sim_ward_state, _SNAPSHOT_RNG, st.sim_ward_occ_history)
    for wid, rows in out.items():
        st.sim_bed_forecast[wid] = rows
    return {wid: rows[0].get("forecast_meta", {}).get("training_source", "?") if rows else "?" for wid, rows in out.items()}
