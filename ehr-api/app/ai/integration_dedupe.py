"""
Idempotency helpers for Phase 3 integration census / HL7 ADT ingestion.

Default: bounded in-memory TTL map (per process).

Optional: ``EHR_INTEGRATION_IDEMPOTENCY_REDIS=true`` stores responses in Redis using
``EHR_REDIS_URL`` so multiple Uvicorn workers / replicas replay consistently.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from copy import deepcopy
from typing import Any

from app.config import settings

TTL_SEC_DEFAULT = float(86400 * 7)  # pilot: replay window seven days
_MAX_KEYS = 8192
_REDIS_KEY_PREFIX = "ehr:integration:idem:"

_log = logging.getLogger(__name__)

_lock = threading.Lock()
_recent: dict[str, tuple[float, dict[str, Any]]] = {}
_sync_lock = threading.Lock()
_sync_redis: Any = None


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


def _redis_k(key: str) -> str:
    return f"{_REDIS_KEY_PREFIX}{key.strip()}"


def _get_sync_redis() -> Any | None:
    """Lazy sync Redis client for idempotency (separate from async cache client in ``store``)."""
    global _sync_redis
    if not settings.integration_idempotency_redis:
        return None
    url = (settings.redis_url or "").strip()
    if not url:
        return None
    if _sync_redis is not None:
        return _sync_redis
    with _sync_lock:
        if _sync_redis is not None:
            return _sync_redis
        try:
            import redis as redis_sync

            _sync_redis = redis_sync.Redis.from_url(url, decode_responses=True)
        except Exception:
            _log.exception("integration idempotency: failed to create sync Redis client")
            return None
    return _sync_redis


def _redis_replay(key: str) -> dict[str, Any] | None:
    r = _get_sync_redis()
    if r is None:
        return None
    try:
        raw = r.get(_redis_k(key))
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        _log.warning("integration idempotency: Redis GET failed; falling back to in-memory", exc_info=True)
        return None


def _redis_remember(key: str, envelope: dict[str, Any]) -> None:
    r = _get_sync_redis()
    if r is None:
        return
    try:
        ttl = max(1, int(TTL_SEC_DEFAULT))
        r.set(_redis_k(key), json.dumps(envelope), ex=ttl)
    except Exception:
        _log.warning("integration idempotency: Redis SET failed; using in-memory only", exc_info=True)


def replay_if_recent(*, key: str, ttl_sec: float = TTL_SEC_DEFAULT) -> dict[str, Any] | None:
    """Return stale response copy if ``key`` was seen recently, else ``None``."""
    if not key.strip():
        return None
    from_redis = _redis_replay(key.strip())
    if from_redis is not None:
        return deepcopy(from_redis)

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
    _redis_remember(k, envelope)

    now = time.time()
    with _lock:
        _prune_locked(now, TTL_SEC_DEFAULT)
        _recent[k] = (now, envelope)


def clear_recent_responses_for_tests() -> None:
    """Empty the replay cache (pytest isolation; not for production use)."""
    global _sync_redis
    with _lock:
        _recent.clear()
    with _sync_lock:
        _sync_redis = None
