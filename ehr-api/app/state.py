import os
import time
from typing import Any

# Generic UI action log (Phase 1 UI)
ui_actions: list[dict] = []

# Integration: Kenya MOH Master Facility List (KMHFL)
kmhfl_cache: dict[str, tuple[float, dict]] = {}
KMHFL_TTL_S = 300.0


def kmhfl_base_url() -> str:
    return (os.getenv("KMHFL_BASE_URL") or "https://kmhfl.health.go.ke").rstrip("/")


# ----- Lab portal (Phase 1 UI, in-memory) -----
lab_orders: list[dict] = [
    {
        "id": "LABORD-1001",
        "patient_id": "P001",
        "afl_id": "AFL-78841209",
        "panel": "U&E",
        "priority": "Urgent",
        "status": "Collected",
        "requested_at": "2026-04-03 09:12",
    }
]
lab_results: list[dict] = [
    {"id": "RES-2001", "patient_id": "P001", "test": "Potassium (K⁺)", "value": "6.8", "unit": "mmol/L", "flag": "HIGH", "ts": "2026-04-02 11:32"},
    {"id": "RES-2002", "patient_id": "P001", "test": "Creatinine", "value": "112", "unit": "µmol/L", "flag": "N", "ts": "2026-04-02 11:32"},
]
lab_qc: list[dict] = [
    {"id": "QC-3001", "instrument": "Chem Analyzer A", "control": "Level 1", "status": "PASS", "ts": "2026-04-03 08:00"},
    {"id": "QC-3002", "instrument": "Hematology B", "control": "Level 2", "status": "PASS", "ts": "2026-04-03 08:05"},
]
lab_imaging: list[dict] = [
    {"id": "IMG-4001", "patient_id": "P002", "study": "CXR — PA", "modality": "X-Ray", "status": "Pending read", "ts": "2026-04-03 09:40"}
]


# ----- Pharmacy portal (Phase 1 UI, in-memory) -----
pharmacy_prescriptions: list[dict] = [
    {"id": "RX-1001", "patient": "Wangui Njoroge", "patient_id": "P001", "drug": "Amlodipine 5mg", "dose": "1 tab daily", "status": "Pending", "verified": False},
    {"id": "RX-1002", "patient": "Omar Abdullahi", "patient_id": "P002", "drug": "Morphine 10mg", "dose": "q4h PRN", "status": "Pending", "verified": False},
    {"id": "RX-1003", "patient": "Adhiambo Grace", "patient_id": "P003", "drug": "Metformin 500mg", "dose": "bid", "status": "Pending", "verified": False},
]
pharmacy_stock: list[dict] = [
    {"name": "Amlodipine 5mg", "qty": 120, "min": 50, "unit": "tablets"},
    {"name": "Morphine 10mg", "qty": 8, "min": 20, "unit": "ampoules"},
    {"name": "Paracetamol IV", "qty": 4, "min": 15, "unit": "vials"},
    {"name": "Saline 0.9% 500mL", "qty": 22, "min": 10, "unit": "bottles"},
]
pharmacy_audit: list[dict] = [
    {"ts": "2026-04-03 10:12:45", "action": "Dispense", "user": "Pauline K.", "detail": "RX-1001 Amlodipine 30 tablets", "status": "LOGGED"},
    {"ts": "2026-04-03 09:58:02", "action": "Verify", "user": "Pauline K.", "detail": "RX-1001 approved after allergy check", "status": "LOGGED"},
]


def now_ts() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


# ----- Admin: User management (Phase 1 UI, in-memory) -----
admin_users: list[dict] = [
    {
        "id": "USR-0001",
        "name": "M. Kamau",
        "email": "m.kamau@moh.go.ke",
        "role": "System Admin",
        "reg": "ADM-0142",
        "facility": "MOH HQ",
        "auth": "Biometric",
        "status": "Active",
        "last_login": "Today 08:12",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
    {
        "id": "USR-0002",
        "name": "S. Njeri",
        "email": "s.njeri@unihealth.ke",
        "role": "Security Admin",
        "reg": "SEC-0081",
        "facility": "UniHealth SecOps",
        "auth": "Practice 360",
        "status": "Active",
        "last_login": "Today 07:51",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
    {
        "id": "USR-0003",
        "name": "J. Odhiambo",
        "email": "j.odhiambo@unihealth.ke",
        "role": "Data Manager",
        "reg": "DM-2210",
        "facility": "Data Hub",
        "auth": "OTP",
        "status": "Pending",
        "last_login": "Yesterday 19:02",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
]

# ----- Admin: Facilities (Phase 1 UI, in-memory) -----
admin_facilities: list[dict] = [
    {
        "id": "FAC-0001",
        "name": "KNH Nairobi",
        "level": "Level 6",
        "county": "Nairobi",
        "status": "ONLINE",
        "latency": "22ms",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
    {
        "id": "FAC-0002",
        "name": "Nakuru Level 5",
        "level": "Level 5",
        "county": "Nakuru",
        "status": "DEGRADED",
        "latency": "88ms",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
    {
        "id": "FAC-0003",
        "name": "MTRH Eldoret",
        "level": "Level 6",
        "county": "Uasin Gishu",
        "status": "ONLINE",
        "latency": "31ms",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
]

# ----- Admin: Patient Registry (Phase 1 UI, in-memory) -----
admin_patients: list[dict] = [
    {
        "id": "PAT-0001",
        "afl_id": "AFL-2026-KE-00312",
        "name": "Wangui Njoroge",
        "email": "wangui.njoroge@example.com",
        "phone": "+254700000312",
        "facility": "KNH Nairobi",
        "status": "Active",
        "created_at": time.time(),
        "updated_at": time.time(),
    }
]


# ----- Nurse action endpoints (Phase 1 UI, in-memory) -----
nurse_incidents: list[dict] = []
nurse_supply_requests: list[dict] = []
nurse_tasks: list[dict] = []
nurse_fluid_entries: list[dict] = []
nurse_wound_entries: list[dict] = []
nurse_handover_notes: list[dict] = []


# ----- Patient correlation + walk-ins (Phase 1 UI, in-memory) -----
# Core patient identity shared across facilities (UHID = global person identifier).
# Aliases map facility-local MRNs to the UHID.
patients_core: list[dict] = [
    {
        "uhid": "UHID-000001",
        "full_name": "Wangui Njoroge",
        "dob": "1990-02-11",
        "gender": "female",
        "phone": "+254700000312",
        "national_id": None,
        "created_at": time.time(),
        "updated_at": time.time(),
    }
]

patient_aliases: list[dict] = [
    {
        "uhid": "UHID-000001",
        "facility_id": "FAC-0001",
        "facility_name": "KNH Nairobi",
        "mrn": "PAT-0001",
        "created_at": time.time(),
    }
]

# Walk-in visits (quick registration + triage/encounter at a facility).
walkin_visits: list[dict] = []

# ═══════════════════════════════════════════════════════════════════════
# Phase 3 — AI Assist state  (populated at startup by simulator.seed_all)
# ═══════════════════════════════════════════════════════════════════════

# Simulated patient pool (25 patients across 6 wards)
sim_patients: list[dict] = []

# Vital-sign time series: {sim_id: [reading, ...]}
sim_vitals: dict[str, list[dict]] = {}

# Patient-specific rolling baselines: {sim_id: {metric: {mean, std}}}
sim_baselines: dict[str, dict] = {}

# Current ward occupancy: {ward_id: ward_dict}
sim_ward_state: dict[str, dict] = {}

# 48-h bed demand forecast: {ward_id: [step, ...]}
sim_bed_forecast: dict[str, list[dict]] = {}

# Active anomaly alerts (unacknowledged + recent acknowledged)
ai_anomalies: list[dict] = []

# KDPA-compliant AI audit trail (every AI recommendation + clinician feedback)
ai_audit_log: list[dict] = []


def bootstrap_ai_state() -> None:
    """Called once at FastAPI startup to seed Phase 3 in-memory data."""
    from app.ai.simulator import seed_all
    data = seed_all()
    sim_patients.extend(data["patients"])
    sim_vitals.update(data["vitals"])
    sim_baselines.update(data["baselines"])
    sim_ward_state.update(data["ward_state"])
    sim_bed_forecast.update(data["forecast"])


# ----- Appointments (cross-user: booked by patient, visible to doctor/nurse) -----
appointments: list[dict] = [
    {
        "id": "APT-2026-001",
        "patient_id": "P001",
        "patient_name": "P. Mutiso",
        "facility": "KNH Nairobi",
        "department": "Cardiology",
        "date": "2026-05-14",
        "time": "09:00",
        "notes": "Follow-up — hypertension management.",
        "status": "confirmed",
        "booked_by": "patient",
        "created_at": time.time(),
    },
    {
        "id": "APT-2026-002",
        "patient_id": "P001",
        "patient_name": "P. Mutiso",
        "facility": "Coast General Hospital",
        "department": "Follow-up",
        "date": "2026-05-21",
        "time": "14:00",
        "notes": "Routine review.",
        "status": "pending",
        "booked_by": "patient",
        "created_at": time.time(),
    },
]
