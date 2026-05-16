"""Unit tests for ``integration_dedupe`` (memory vs optional Redis idempotency)."""

from __future__ import annotations

import json

import pytest

from app.ai import integration_dedupe as dedupe
from app.config import settings


@pytest.fixture(autouse=True)
def _reset_dedupe():
    dedupe.clear_recent_responses_for_tests()
    yield
    dedupe.clear_recent_responses_for_tests()


def test_replay_round_trip_in_memory_only() -> None:
    assert dedupe.replay_if_recent(key="k-mem") is None
    dedupe.remember_response("k-mem", {"occupied": 3})
    got = dedupe.replay_if_recent(key="k-mem")
    assert got == {"occupied": 3}


def test_redis_write_then_replay_when_flag_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "integration_idempotency_redis", True, raising=False)

    store: dict[str, str] = {}

    class FakeRedis:
        def get(self, k: str):
            return store.get(k)

        def set(self, k: str, v: str, ex: int | None = None) -> None:
            store[k] = v

    fake = FakeRedis()
    monkeypatch.setattr(dedupe, "_get_sync_redis", lambda: fake)

    assert dedupe.replay_if_recent(key="k-redis") is None
    dedupe.remember_response("k-redis", {"x": 1})
    rk = f"{dedupe._REDIS_KEY_PREFIX}k-redis"
    assert rk in store
    assert json.loads(store[rk]) == {"x": 1}
    assert dedupe.replay_if_recent(key="k-redis") == {"x": 1}


def test_remember_strips_idempotent_replay_field() -> None:
    dedupe.remember_response("strip", {"a": 1, "idempotent_replay": True})
    got = dedupe.replay_if_recent(key="strip")
    assert got == {"a": 1}
    assert "idempotent_replay" not in got
