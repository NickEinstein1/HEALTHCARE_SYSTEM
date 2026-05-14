"""
Optional SQLite-backed durability for ward census hourly snapshots.

File path from ``settings.ward_census_sqlite_path`` (``EHR_WARD_CENSUS_SQLITE_PATH``).
SQLite is synchronous here — adequate for modest integration volume; Postgres is the Tier-1 persistence target later.
"""

from __future__ import annotations

import sqlite3
import threading
from pathlib import Path
from typing import Any

_import_lock = threading.Lock()
_schema_done: set[str] = set()


def _connect(path: str) -> sqlite3.Connection:
    p = Path(path).expanduser()
    p.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(p))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


def _ensure_schema(conn: sqlite3.Connection, abs_path: str) -> None:
    with _import_lock:
        if abs_path in _schema_done:
            return
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS ward_census_snapshot (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ward_id TEXT NOT NULL,
            ts_epoch REAL NOT NULL,
            occupied INTEGER NOT NULL,
            capacity INTEGER NOT NULL,
            source TEXT,
            UNIQUE(ward_id, ts_epoch)
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_ward_ts ON ward_census_snapshot "
        "(ward_id, ts_epoch DESC)"
    )
    conn.commit()
    with _import_lock:
        _schema_done.add(abs_path)


def persist_census_snapshot(
    path: str,
    *,
    ward_id: str,
    ts_epoch: float,
    occupied: int,
    capacity: int,
    source: str,
) -> None:
    if not path.strip():
        return
    rp = str(Path(path).expanduser().resolve())
    conn = _connect(path)
    try:
        _ensure_schema(conn, rp)
        conn.execute(
            "INSERT OR REPLACE INTO ward_census_snapshot "
            "(ward_id, ts_epoch, occupied, capacity, source) VALUES (?, ?, ?, ?, ?)",
            (ward_id, float(ts_epoch), int(occupied), int(capacity), source),
        )
        conn.commit()
    finally:
        conn.close()


def load_all_snapshots_ordered(path: str) -> dict[str, list[dict[str, Any]]]:
    """Return snapshots grouped per ward ascending by epoch."""
    if not path.strip():
        return {}
    abs_p = str(Path(path).expanduser().resolve())
    conn = _connect(abs_p)
    try:
        _ensure_schema(conn, abs_p)
        cur = conn.execute(
            "SELECT ward_id, ts_epoch, occupied, capacity, COALESCE(source, '') "
            "FROM ward_census_snapshot ORDER BY ward_id ASC, ts_epoch ASC"
        )
        out: dict[str, list[dict[str, Any]]] = {}
        for wid, ts_ep, occ, cap, src in cur.fetchall():
            out.setdefault(wid, []).append(
                {
                    "ts_epoch": float(ts_ep),
                    "occupied": int(occ),
                    "capacity": int(cap),
                    "source": src,
                },
            )
        return out
    finally:
        conn.close()


def tail_history(path: str, *, max_tail: int) -> dict[str, list[dict[str, Any]]]:
    bundled = load_all_snapshots_ordered(path)
    tail: dict[str, list[dict[str, Any]]] = {}
    for wid, rows in bundled.items():
        tail[wid] = rows[-max_tail:] if rows else []
    return tail

