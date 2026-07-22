"""
UHIC — UniHealth Insurance Cover API (port 8200 logical surface on shared gateway).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from app.auth import require_bound_patient_id, require_role
from app.insurance_service import (
    actuarial_forecast,
    actuarial_reserves,
    bootstrap_uhic_state,
    coverage_for_patient,
    dashboard_summary,
    decide_claim,
    fraud_trend,
    get_member,
    list_claims,
    list_members,
    list_policies,
    provider_risk_scores,
    quote_premium,
    submit_claim,
    sync_bundle,
)

router = APIRouter(tags=["insurance", "uhic"])

_UHIC_ROLES = [
    "admin",
    "billing",
    "underwriter",
    "claims_adjudicator",
    "compliance_auditor",
    "broker",
    "scheme_finance",
    "doctor",
    "patient",
]


def _patient_id_from_request(request: Request, role: str, query_pid: str | None) -> str | None:
    return require_bound_patient_id(
        request,
        role,
        query_pid=query_pid,
        required=(role == "patient"),
    )


@router.get("/insurance/uhic/summary", summary="UHIC dashboard KPIs")
def uhic_summary(request: Request):
    require_role(request, _UHIC_ROLES)
    bootstrap_uhic_state()
    return dashboard_summary()


@router.get("/insurance/members", summary="List insurance members")
def insurance_members_list(
    request: Request,
    scheme_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
):
    require_role(request, _UHIC_ROLES)
    return {"members": list_members(scheme_type=scheme_type, status=status)}


@router.get("/insurance/members/{member_id}", summary="Get member")
def insurance_member_get(request: Request, member_id: str):
    require_role(request, _UHIC_ROLES)
    row = get_member(member_id)
    if not row:
        raise HTTPException(status_code=404, detail="member not found")
    return {"member": row, "policies": list_policies(member_id)}


@router.get("/insurance/members/by-patient/{patient_id}", summary="Member by EHR patient ID")
def insurance_member_by_patient(request: Request, patient_id: str):
    role = require_role(request, _UHIC_ROLES)
    pid = _patient_id_from_request(request, role, patient_id) or patient_id
    if role == "patient" and pid != patient_id:
        raise HTTPException(status_code=403, detail="forbidden")
    cov = coverage_for_patient(pid)
    if not cov:
        raise HTTPException(status_code=404, detail="no coverage for patient")
    return cov


@router.get("/insurance/coverage/{patient_id}", summary="FHIR-aligned coverage snapshot")
def insurance_coverage(request: Request, patient_id: str):
    role = require_role(request, _UHIC_ROLES)
    pid = _patient_id_from_request(request, role, patient_id) or patient_id
    if role == "patient" and pid != patient_id:
        raise HTTPException(status_code=403, detail="forbidden")
    cov = coverage_for_patient(pid)
    if not cov:
        return {"eligible": False, "patient_id": pid, "policies": []}
    return {"eligible": cov["eligible"], "patient_id": pid, **cov}


@router.get("/insurance/policies", summary="List policies")
def insurance_policies_list(
    request: Request,
    member_id: str | None = Query(default=None),
):
    require_role(request, _UHIC_ROLES)
    return {"policies": list_policies(member_id=member_id)}


@router.get("/insurance/claims", summary="List claims")
def insurance_claims_list(
    request: Request,
    member_id: str | None = Query(default=None),
    provider_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    patient_id: str | None = Query(default=None),
):
    role = require_role(request, _UHIC_ROLES)
    pid = _patient_id_from_request(request, role, patient_id)
    if role == "patient":
        return {"claims": list_claims(patient_id=pid, status=status)}
    return {
        "claims": list_claims(
            member_id=member_id,
            provider_id=provider_id,
            status=status,
            patient_id=pid,
        ),
    }


@router.get("/insurance/sync", summary="Versioned sync hub (claims · coverage · billing)")
def insurance_sync(
    request: Request,
    patient_id: str | None = Query(default=None),
    since_version: int = Query(default=0, ge=0),
    include_summary: bool = Query(default=False),
):
    role = require_role(request, _UHIC_ROLES)
    pid = _patient_id_from_request(request, role, patient_id)
    if role == "patient" and not pid:
        raise HTTPException(status_code=400, detail="patient scope required")
    return sync_bundle(
        patient_id=pid,
        since_version=since_version,
        include_summary=include_summary and role != "patient",
    )


@router.post("/insurance/claims", summary="Submit claim (requires encounter_id FK)")
def insurance_claim_submit(request: Request, payload: dict):
    require_role(request, ["claims_adjudicator", "admin", "doctor", "billing"])
    try:
        row = submit_claim(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "submitted", "claim": row}


@router.post("/insurance/claims/{claim_id}/decision", summary="Adjudicate claim")
def insurance_claim_decision(request: Request, claim_id: str, payload: dict):
    require_role(request, ["claims_adjudicator", "admin", "compliance_auditor"])
    try:
        row = decide_claim(claim_id, str(payload.get("decision", "")), str(payload.get("note", "")))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "decided", "claim": row}


@router.post("/insurance/premium/quote", summary="Actuarial premium / contribution quote")
def insurance_premium_quote(request: Request, payload: dict):
    require_role(request, _UHIC_ROLES)
    return quote_premium(payload)


@router.get("/insurance/actuarial/reserves", summary="IBNR and loss-ratio reserves")
def insurance_actuarial_reserves(request: Request):
    require_role(request, ["underwriter", "scheme_finance", "admin", "compliance_auditor"])
    return actuarial_reserves()


@router.get("/insurance/actuarial/forecast", summary="ECCIF / fund depletion forecast")
def insurance_actuarial_forecast(request: Request, months: int = Query(default=12, ge=1, le=36)):
    require_role(request, ["underwriter", "scheme_finance", "admin"])
    return actuarial_forecast(months=months)


@router.get("/insurance/providers/risk-scores", summary="Provider fraud risk scorecards")
def insurance_provider_scores(request: Request):
    require_role(request, ["compliance_auditor", "claims_adjudicator", "admin"])
    return {"providers": provider_risk_scores()}


@router.get("/audit/aggregate/fraud-trend", summary="Scheme-level fraud analytics")
def audit_fraud_trend(request: Request):
    require_role(request, ["compliance_auditor", "admin", "claims_adjudicator"])
    return fraud_trend()


@router.get("/audit/providers/{provider_id}/score", summary="Provider audit score")
def audit_provider_score(request: Request, provider_id: str):
    require_role(request, ["compliance_auditor", "admin", "claims_adjudicator"])
    rows = provider_risk_scores()
    row = next((p for p in rows if p.get("provider_id") == provider_id), None)
    if not row:
        raise HTTPException(status_code=404, detail="provider not found")
    return row
