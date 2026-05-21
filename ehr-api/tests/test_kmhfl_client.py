"""KMHFL client: URL normalization and demo fallback."""

import pytest

from app import kmhfl_client


def test_kmhfl_base_url_normalizes_legacy_host(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KMHFL_BASE_URL", "https://kmhfl.health.go.ke")
    assert kmhfl_client.kmhfl_base_url() == "https://api.kmhfr.health.go.ke"


def test_demo_fallback_filters_search() -> None:
    data = kmhfl_client._demo_response(search="kenyatta", page=1, limit=10, reason="test")
    assert data["demo_fallback"] is True
    assert len(data["results"]) == 1
    assert "Kenyatta" in data["results"][0]["name"]


def test_fetch_uses_demo_when_unauthorized(monkeypatch: pytest.MonkeyPatch) -> None:
    import asyncio

    monkeypatch.setenv("KMHFL_USE_DEMO_FALLBACK", "true")
    monkeypatch.delenv("KMHFL_API_TOKEN", raising=False)
    monkeypatch.delenv("KMHFL_USERNAME", raising=False)
    data = asyncio.run(kmhfl_client.fetch_kmhfl_facilities(limit=5, page=1))
    assert data.get("demo_fallback") is True
    assert len(data.get("results") or []) > 0
