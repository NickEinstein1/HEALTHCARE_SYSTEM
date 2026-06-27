from fastapi import APIRouter

from app.api.routers import (
    admin, appointments, auth_status, clinical_ai, fhir, integrations,
    lab, legal_documents, metrics, nurse, patient_profile, pharmacy, referrals, ui, walkins,
)
from app.api.routers import ai as ai_router_module

api_router = APIRouter()

# Admin / Nurse
api_router.include_router(admin.router, tags=["admin"])
api_router.include_router(nurse.router, tags=["nurse"])

# Integrations
api_router.include_router(integrations.router, tags=["integrations"])

# UI action log
api_router.include_router(ui.router, tags=["ui"])

# Metrics
api_router.include_router(metrics.router, tags=["metrics"])

# Auth (OIDC status / whoami)
api_router.include_router(auth_status.router)

# FHIR + consent
api_router.include_router(fhir.router, tags=["fhir"])

# Lab & Pharmacy portals
api_router.include_router(lab.router, tags=["lab"])
api_router.include_router(pharmacy.router, tags=["pharmacy"])

# Walk-ins + correlation
api_router.include_router(walkins.router, tags=["walkins"])

# Appointments (cross-user scheduling)
api_router.include_router(appointments.router, tags=["appointments"])

# Patient portal profile + security
api_router.include_router(patient_profile.router)

# Phase 3 — AI Assist (diagnosis hints, anomaly detection, bed forecasting, WebSocket alerts)
api_router.include_router(ai_router_module.router, tags=["ai"])
api_router.include_router(clinical_ai.router)
api_router.include_router(legal_documents.router)
api_router.include_router(referrals.router)

