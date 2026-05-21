"""
Phase 2 — national analytics aggregate consumer (scaffold).

Consumes ``ehr.analytics.aggregate`` and writes rollups to stdout / future warehouse.
Hospital onboarding will attach per-facility emitters later.
"""

from __future__ import annotations

import json
import os
import sys

from kafka import KafkaConsumer

TOPIC = "ehr.analytics.aggregate"
BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


def main() -> None:
    consumer = KafkaConsumer(
        TOPIC,
        bootstrap_servers=BOOTSTRAP,
        group_id="unihealth-analytics-aggregate",
        auto_offset_reset="earliest",
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
    )
    print(f"analytics-pipeline listening on {TOPIC} @ {BOOTSTRAP}", flush=True)
    for msg in consumer:
        payload = msg.value
        # Pilot: log aggregate shape only (facility_id, metric, period, value — no patient ids)
        print(json.dumps({"topic": TOPIC, "partition": msg.partition, "aggregate": payload}), flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
