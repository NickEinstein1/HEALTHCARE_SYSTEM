"""Emit national analytics aggregate events (no PII)."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from confluent_kafka import Producer

from app.config import settings

_log = logging.getLogger(__name__)
_producer: Producer | None = None

TOPIC_AGGREGATE = "ehr.analytics.aggregate"


def _get_producer() -> Producer | None:
    global _producer
    servers = (settings.kafka_bootstrap_servers or "").strip()
    if not servers:
        return None
    if _producer is None:
        _producer = Producer({"bootstrap.servers": servers})
    return _producer


def emit_aggregate_sync(
    *,
    facility_id: str,
    metric: str,
    period: str,
    value: float | int,
    dimensions: dict[str, Any] | None = None,
) -> None:
    """Publish a de-identified aggregate event for the national pipeline."""
    payload = {
        "facility_id": facility_id,
        "metric": metric,
        "period": period,
        "value": value,
        "dimensions": dimensions or {},
        "emitted_at": datetime.now(timezone.utc).isoformat(),
    }
    prod = _get_producer()
    if prod is None:
        _log.debug("analytics aggregate skipped (no kafka): %s", payload)
        return
    prod.produce(TOPIC_AGGREGATE, json.dumps(payload).encode("utf-8"))
    prod.flush()
