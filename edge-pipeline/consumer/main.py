"""
Phase 1 edge pipeline: consume events from Kafka,
upsert into PostgreSQL, invalidate Redis cache so gateway serves fresh data.

Implementation: confluent-kafka (Python binding to C client) for Python 3.13 compatibility.
"""

import json
import os
import signal
import sys
from datetime import date, datetime

import psycopg2
import redis
from confluent_kafka import Consumer, KafkaException

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
    redis_client.delete(f"patient:{pid}:summary")


def _patient_exists(conn, patient_id: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM patients WHERE id = %s LIMIT 1", (patient_id,))
        return cur.fetchone() is not None


def process_encounter(payload: dict, conn, redis_client):
    e = payload.get("resource", payload)
    eid = e.get("id") or payload.get("encounterId")
    subj = e.get("subject") or {}
    ref = subj.get("reference", "") if isinstance(subj, dict) else getattr(subj, "reference", "") or ""
    pid = e.get("patient_id") or e.get("patientId") or (ref.split("/")[-1] if ref else None)
    if not eid or not pid:
        return
    # Messages may arrive out of order across partitions. Avoid FK violation cascades.
    if not _patient_exists(conn, pid):
        print(f"Skip encounter {eid}: patient {pid} not yet in DB", file=sys.stderr, flush=True)
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
    redis_client.delete(f"patient:{pid}:summary")


def _extract_code(resource: dict) -> str | None:
    coding = None
    if isinstance(resource.get("code"), dict):
        coding = (resource.get("code") or {}).get("coding")
    if isinstance(coding, list) and coding:
        first = coding[0] or {}
        return first.get("code") or first.get("display")
    return resource.get("code") if isinstance(resource.get("code"), str) else None


def process_observation(payload: dict, conn, redis_client):
    o = payload.get("resource", payload)
    oid = o.get("id") or payload.get("observationId")
    subj = o.get("subject") or {}
    ref = subj.get("reference", "") if isinstance(subj, dict) else ""
    pid = o.get("patient_id") or o.get("patientId") or (ref.split("/")[-1] if ref else None)
    if not oid or not pid:
        return
    if not _patient_exists(conn, pid):
        print(f"Skip observation {oid}: patient {pid} not yet in DB", file=sys.stderr, flush=True)
        return

    effective = o.get("effective_time") or (o.get("effectiveDateTime") if isinstance(o.get("effectiveDateTime"), str) else None)
    if effective is None and isinstance(o.get("effective"), dict):
        effective = o["effective"].get("dateTime") or o["effective"].get("start")
    eff_dt = parse_datetime(effective) if effective else None

    code = o.get("code_text") or _extract_code(o)
    value_text = None
    unit = None
    if isinstance(o.get("valueQuantity"), dict):
        vq = o["valueQuantity"]
        value_text = str(vq.get("value")) if vq.get("value") is not None else None
        unit = vq.get("unit") or vq.get("code")
    elif o.get("valueString") is not None:
        value_text = str(o.get("valueString"))
    elif o.get("valueBoolean") is not None:
        value_text = str(o.get("valueBoolean"))

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO observations (id, patient_id, code, effective_time, value_text, unit, resource_json)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET
                patient_id = EXCLUDED.patient_id,
                code = EXCLUDED.code,
                effective_time = EXCLUDED.effective_time,
                value_text = EXCLUDED.value_text,
                unit = EXCLUDED.unit,
                resource_json = EXCLUDED.resource_json,
                updated_at = NOW()
            """,
            (oid, pid, code, eff_dt, value_text, unit, json.dumps(o)),
        )
    redis_client.delete(f"patient:{pid}:observations")


def process_medication_request(payload: dict, conn, redis_client):
    m = payload.get("resource", payload)
    mid = m.get("id") or payload.get("medicationRequestId")
    subj = m.get("subject") or {}
    ref = subj.get("reference", "") if isinstance(subj, dict) else ""
    pid = m.get("patient_id") or m.get("patientId") or (ref.split("/")[-1] if ref else None)
    if not mid or not pid:
        return
    if not _patient_exists(conn, pid):
        print(f"Skip med_request {mid}: patient {pid} not yet in DB", file=sys.stderr, flush=True)
        return

    med_code = None
    if isinstance(m.get("medicationCodeableConcept"), dict):
        med_code = _extract_code(m.get("medicationCodeableConcept") or {})
    if med_code is None and isinstance(m.get("medication_code"), str):
        med_code = m.get("medication_code")

    authored_on = parse_datetime(m.get("authoredOn") or m.get("authored_on"))
    status = m.get("status")
    dosage_text = None
    if isinstance(m.get("dosageInstruction"), list) and m["dosageInstruction"]:
        dosage_text = (m["dosageInstruction"][0] or {}).get("text")
    if dosage_text is None:
        dosage_text = m.get("dosage_text")

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO medication_requests (id, patient_id, medication_code, status, authored_on, dosage_text, resource_json)
            VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
            ON CONFLICT (id) DO UPDATE SET
                patient_id = EXCLUDED.patient_id,
                medication_code = EXCLUDED.medication_code,
                status = EXCLUDED.status,
                authored_on = EXCLUDED.authored_on,
                dosage_text = EXCLUDED.dosage_text,
                resource_json = EXCLUDED.resource_json,
                updated_at = NOW()
            """,
            (mid, pid, med_code, status, authored_on, dosage_text, json.dumps(m)),
        )
    redis_client.delete(f"patient:{pid}:med_requests")


def run():
    print(f"Edge consumer starting. bootstrap={KAFKA_BOOTSTRAP}", flush=True)
    consumer = Consumer(
        {
            "bootstrap.servers": KAFKA_BOOTSTRAP,
            "group.id": "edge-pipeline-consumer",
            "auto.offset.reset": "earliest",
        }
    )
    consumer.subscribe(
        ["ehr.patient", "ehr.encounter", "ehr.observation", "ehr.medication_request"]
    )
    print("Subscribed to topics: ehr.patient, ehr.encounter, ehr.observation, ehr.medication_request", flush=True)
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    conn = psycopg2.connect(POSTGRES_DSN)
    # Avoid "transaction aborted" cascading failures in dev.
    conn.autocommit = True

    stopped = False

    def on_signal(*_):
        nonlocal stopped
        stopped = True

    signal.signal(signal.SIGINT, on_signal)
    signal.signal(signal.SIGTERM, on_signal)

    try:
        while not stopped:
            msg = consumer.poll(1.0)
            if msg is None:
                continue
            if msg.error():
                # Log and continue; in production, handle specific errors.
                print(f"Kafka error: {msg.error()}", file=sys.stderr)
                continue
            topic = msg.topic()
            # Heartbeat log on first message per topic could be added later; keep quiet for latency.
            try:
                payload = json.loads(msg.value().decode("utf-8")) if msg.value() else None
            except Exception as exc:
                print(f"Error decoding message on {topic}: {exc}", file=sys.stderr)
                continue
            if not payload:
                continue
            try:
                if topic == "ehr.patient":
                    process_patient(payload, conn, redis_client)
                elif topic == "ehr.encounter":
                    process_encounter(payload, conn, redis_client)
                elif topic == "ehr.observation":
                    process_observation(payload, conn, redis_client)
                elif topic == "ehr.medication_request":
                    process_medication_request(payload, conn, redis_client)
            except Exception as exc:
                try:
                    conn.rollback()
                except Exception:
                    pass
                print(f"Error processing {topic}: {exc}", file=sys.stderr)
    finally:
        try:
            consumer.close()
        except Exception:
            pass
        conn.close()
        redis_client.close()


if __name__ == "__main__":
    run()
