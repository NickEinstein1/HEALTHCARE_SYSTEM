"""
Idempotency helpers for Phase 3 integration census / HL7 ADT ingestion.

Keeps bounded in-memory TTL cache (replay last JSON response).

Thread-safe — safe under concurrent FastAPI workers only within single process:
use Redis for cross-replica replay in production.
"""

from __future__ import annotations

import threading
import time
from copy import deepcopy
from typing import Any

TTL_SEC_DEFAULT = float(86400 * 7)  # pilot: replay window seven days
_MAX_KEYS = 8192

_lock = threading.Lock()
_recent: dict[str, tuple[float, dict[str, Any]]] = {}


def _prune_locked(now: float, ttl_sec: float) -> None:
    """Drop expired keys to cap memory churn."""
    if not _recent:
        return
    dead = [k for k, (ts, _) in _recent.items() if now - ts > ttl_sec]
    for k in dead:
        del _recent[k]
    if len(_recent) <= _MAX_KEYS:
        return
    extras = sorted(_recent.items(), key=lambda kv: kv[1][0])[: len(_recent) - _MAX_KEYS]
    for k, _ in extras:
        del _recent[k]


def replay_if_recent(*, key: str, ttl_sec: float = TTL_SEC_DEFAULT) -> dict[str, Any] | None:
    """Return stale response copy if ``key`` was seen recently, else ``None``."""
    if not key.strip():
        return None
    now = time.time()
    with _lock:
        _prune_locked(now, ttl_sec)
        item = _recent.get(key.strip())
        if item is None:
            return None
        ts_saved, cached = item
        if now - ts_saved > ttl_sec:
            del _recent[key.strip()]
            return None
        return deepcopy(cached)


def remember_response(key: str, payload: dict[str, Any]) -> None:
    """Persist JSON-serialisable response envelope for replay (best-effort)."""
    k = key.strip()
    if not k:
        return
    envelope = dict(payload)
    envelope.pop("idempotent_replay", None)
    now = time.time()
    with _lock:
        _prune_locked(now, TTL_SEC_DEFAULT)
        _recent[k] = (now, envelope)
