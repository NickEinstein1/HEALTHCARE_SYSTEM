"""In-process counters for AI Assist endpoints (complements Kafka aggregates)."""

from __future__ import annotations

from collections import defaultdict
from threading import Lock

_lock = Lock()
_counters: dict[str, int] = defaultdict(int)


def increment(metric: str, amount: int = 1) -> None:
    with _lock:
        _counters[metric] += amount


def snapshot() -> dict[str, int]:
    with _lock:
        return dict(_counters)


def reset_for_tests() -> None:
    with _lock:
        _counters.clear()
