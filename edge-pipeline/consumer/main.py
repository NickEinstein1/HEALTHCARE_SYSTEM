"""
Phase 1 edge pipeline: consume Patient and Encounter events from Kafka,
upsert into PostgreSQL, invalidate Redis cache so gateway serves fresh data.
"""

import json
import os
import signal
import sys
from datetime import date, datetime

import psycopg2
import redis
from kafka import KafkaConsumer

POSTGRES_DSN = os.environ.get(
    "EHR_POSTGRES_DSN",
    "postgresql://ehr:ehr_dev_password@localhost:5432/ehr",
)
REDIS_URL = os.environ.get("EHR_REDIS_URL", "redis://localhost:6379/0")
KAFKA_BOOTSTRAP = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


def parse_date(v):
    if v is None:
        return None
    if isinstance(v, date):
        return v
    if isinstance(v, str):
        return date.fromisoformat(v[:10])
    return None


def parse_datetime(v):
    if v is None:
        return None
    if isinstance(v, datetime):
        return v
    if isinstance(v, str):
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    return None


def process_patient(payload: dict, conn, redis_client):
    p = payload.get("resource", payload)
    pid = p.get("id") or payload.get("patientId")
    if not pid:
        return
    nhi = (p.get("identifier") or [{}])[0].get("value", "") if p.get("identifier") else ""
    nhi = p.get("nhi_number") or nhi or pid
    given = p.get("given_name")
    if given is None and isinstance(p.get("given"), list) and p.get("given"):
        given = p.get("given")[0]
    if given is None:
        given = p.get("given")
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO patients (id, nhi_number, family_name, given_name, birth_date, gender)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                nhi_number = COALESCE(EXCLUDED.nhi_number, patients.nhi_number),
                family_name = COALESCE(EXCLUDED.family_name, patients.family_name),
                given_name = COALESCE(EXCLUDED.given_name, patients.given_name),
                birth_date = COALESCE(EXCLUDED.birth_date, patients.birth_date),
                gender = COALESCE(EXCLUDED.gender, patients.gender),
                updated_at = NOW()
            """,
            (
                pid,
                nhi,
                p.get("family_name") or p.get("family"),
                given,
                parse_date(p.get("birth_date") or p.get("birthDate")),
                p.get("gender"),
            ),
        )
    conn.commit()
    redis_client.delete(f"patient:{pid}:summary")


def process_encounter(payload: dict, conn, redis_client):
    e = payload.get("resource", payload)
    eid = e.get("id") or payload.get("encounterId")
    subj = e.get("subject") or {}
    ref = subj.get("reference", "") if isinstance(subj, dict) else getattr(subj, "reference", "") or ""
    pid = e.get("patient_id") or e.get("patientId") or (ref.split("/")[-1] if ref else None)
    if not eid or not pid:
        return
    sp = e.get("serviceProvider") or {}
    facility = e.get("facility_id") or (sp.get("identifier", {}).get("value") if isinstance(sp, dict) else None) or "FAC-UNK"
    fname = e.get("facility_name") or facility
    period = e.get("period") or {}
    start_ = parse_datetime(e.get("period_start") or period.get("start") if isinstance(period, dict) else None)
    end_ = parse_datetime(e.get("period_end") or period.get("end") if isinstance(period, dict) else None)
    cls = e.get("class_code") or (e.get("class") or {}).get("code") if isinstance(e.get("class"), dict) else "AMB"
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO encounters (id, patient_id, facility_id, facility_name, status, class_code, period_start, period_end)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                patient_id = EXCLUDED.patient_id,
                facility_id = EXCLUDED.facility_id,
                facility_name = EXCLUDED.facility_name,
                status = EXCLUDED.status,
                class_code = EXCLUDED.class_code,
                period_start = EXCLUDED.period_start,
                period_end = EXCLUDED.period_end,
                updated_at = NOW()
            """,
            (eid, pid, facility, fname, e.get("status", "finished"), cls, start_, end_),
        )
    conn.commit()
    redis_client.delete(f"patient:{pid}:summary")


def run():
    consumer = KafkaConsumer(
        "ehr.patient",
        "ehr.encounter",
        bootstrap_servers=KAFKA_BOOTSTRAP.split(","),
        value_deserializer=lambda m: json.loads(m.decode("utf-8")) if m else None,
        auto_offset_reset="earliest",
    )
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    conn = psycopg2.connect(POSTGRES_DSN)

    stopped = False

    def on_signal(*_):
        nonlocal stopped
        stopped = True

    signal.signal(signal.SIGINT, on_signal)
    signal.signal(signal.SIGTERM, on_signal)

    try:
        for msg in consumer:
            if stopped:
                break
            if msg.value is None:
                continue
            payload = msg.value
            topic = msg.topic
            try:
                if topic == "ehr.patient":
                    process_patient(payload, conn, redis_client)
                elif topic == "ehr.encounter":
                    process_encounter(payload, conn, redis_client)
            except Exception as exc:
                print(f"Error processing {topic}: {exc}", file=sys.stderr)
    finally:
        consumer.close()
        conn.close()
        redis_client.close()


if __name__ == "__main__":
    run()
