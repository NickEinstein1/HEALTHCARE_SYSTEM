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


def _ai_patient_scope(patient_id: str | None) -> str:
    if not patient_id:
        return "none"
    pid = str(patient_id).strip().upper()
    if pid.startswith("SIM"):
        return "sim"
    if pid.startswith("P") and pid[1:].isdigit():
        return "portal"
    return "other"


def emit_ai_event(
    event: str,
    *,
    role: str,
    patient_id: str | None = None,
    value: float | int = 1,
    dimensions: dict[str, Any] | None = None,
) -> None:
    """De-identified AI usage metric for ``ehr.analytics.aggregate`` (no raw patient_id)."""
    dims: dict[str, Any] = {
        "role": role,
        "patient_scope": _ai_patient_scope(patient_id),
    }
    if dimensions:
        dims.update(dimensions)
    emit_aggregate_sync(
        facility_id="FAC-A",
        metric=f"ai.{event}",
        period="instant",
        value=value,
        dimensions=dims,
    )
