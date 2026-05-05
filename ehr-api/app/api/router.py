from fastapi import APIRouter

from app.api.routers import admin, fhir, integrations, lab, metrics, nurse, pharmacy, ui

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

# FHIR + consent
api_router.include_router(fhir.router, tags=["fhir"])

# Lab & Pharmacy portals
api_router.include_router(lab.router, tags=["lab"])
api_router.include_router(pharmacy.router, tags=["pharmacy"])

