"""Blocking persistence helpers for sync service code."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Coroutine
from typing import Any, TypeVar

_log = logging.getLogger(__name__)
T = TypeVar("T")


class PersistenceError(RuntimeError):
    """Raised when a required Postgres write fails."""


def persist_now(coro: Coroutine[Any, Any, T], *, timeout: float = 30.0) -> T | None:
    """
    Run a persistence coroutine to completion on the Postgres pool's event loop.

    When ``EHR_INFRA_OPTIONAL=false`` and a pool is expected, failures raise
    ``PersistenceError`` so financial endpoints do not return 200 after a silent miss.
    """
    from app.config import settings
    from app.store import get_postgres_loop, has_postgres_pool

    if not has_postgres_pool():
        coro.close()
        if not settings.infra_optional:
            raise PersistenceError("Postgres pool unavailable for required persistence")
        return None

    loop = get_postgres_loop()
    if loop is None or loop.is_closed():
        coro.close()
        if not settings.infra_optional:
            raise PersistenceError("Postgres event loop unavailable for required persistence")
        return None

    try:
        running = asyncio.get_running_loop()
    except RuntimeError:
        running = None

    if running is loop:
        raise PersistenceError(
            "persist_now cannot block on the pool event loop — await the coroutine instead"
        )

    try:
        fut = asyncio.run_coroutine_threadsafe(coro, loop)
        return fut.result(timeout=timeout)
    except PersistenceError:
        raise
    except Exception as exc:
        _log.exception("persistence failed")
        if not settings.infra_optional:
            raise PersistenceError(str(exc)) from exc
        return None


def schedule_persist(coro: Coroutine[Any, Any, T]) -> None:
    """Alias used by billing/UHIC sync call sites."""
    persist_now(coro)
