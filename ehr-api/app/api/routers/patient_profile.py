"""Patient portal profile CRUD and password change (max 2 changes, current password required)."""

import time
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app import state
from app.patient_security import (
    MAX_PASSWORD_CHANGES,
    MIN_PASSWORD_LENGTH,
    hash_password,
    verify_password,
)
from app.store import get_summary_from_db, update_patient_demographics, delete_summary_cache

router = APIRouter(prefix="/patient", tags=["patient-profile"])


class ProfilePatch(BaseModel):
    given_name: str | None = None
    family_name: str | None = None
    email: str | None = None
    phone: str | None = None
    emergency_name: str | None = None
    emergency_phone: str | None = None
    preferred_language: str | None = None
    notify_sms: bool | None = None
    notify_email: bool | None = None
    notify_push: bool | None = None
    notify_appointments: bool | None = None
    notify_results: bool | None = None


class ChangePasswordBody(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=MIN_PASSWORD_LENGTH)
    confirm_password: str = Field(..., min_length=MIN_PASSWORD_LENGTH)


def _public_profile(row: dict, patient_id: str) -> dict[str, Any]:
    count = int(row.get("password_change_count") or 0)
    remaining = max(0, MAX_PASSWORD_CHANGES - count)
    return {
        "patient_id": patient_id,
        "given_name": row.get("given_name") or "",
        "family_name": row.get("family_name") or "",
        "email": row.get("email") or "",
        "phone": row.get("phone") or "",
        "emergency_name": row.get("emergency_name") or "",
        "emergency_phone": row.get("emergency_phone") or "",
        "preferred_language": row.get("preferred_language") or "en",
        "notify_sms": bool(row.get("notify_sms", True)),
        "notify_email": bool(row.get("notify_email", True)),
        "notify_push": bool(row.get("notify_push", True)),
        "notify_appointments": bool(row.get("notify_appointments", True)),
        "notify_results": bool(row.get("notify_results", True)),
        "password_changes_used": count,
        "password_changes_remaining": remaining,
        "password_changes_allowed": MAX_PASSWORD_CHANGES,
        "has_password": bool(row.get("password_hash")),
        "updated_at": row.get("updated_at"),
    }


@router.get("/{patient_id}/profile")
async def get_profile(patient_id: str):
    pid = patient_id.strip()
    if not pid:
        raise HTTPException(400, "patient_id required")
    row = state.get_or_create_portal_profile(pid)
    out = _public_profile(row, pid)
    summary = await get_summary_from_db(pid, 1)
    if summary:
        p = summary.patient
        out["nhi_number"] = p.nhi_number
        out["gender"] = p.gender
        out["birth_date"] = p.birth_date.isoformat() if p.birth_date else None
        if not out["given_name"] and p.given_name:
            out["given_name"] = p.given_name
        if not out["family_name"] and p.family_name:
            out["family_name"] = p.family_name
    else:
        out["nhi_number"] = None
        out["gender"] = None
        out["birth_date"] = None
    return out


@router.patch("/{patient_id}/profile")
async def patch_profile(patient_id: str, body: ProfilePatch):
    pid = patient_id.strip()
    if not pid:
        raise HTTPException(400, "patient_id required")
    row = state.get_or_create_portal_profile(pid)
    data = body.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, "No fields to update")

    for key, val in data.items():
        if key == "email" and val is not None:
            email = str(val).strip()
            if email and "@" not in email:
                raise HTTPException(400, "Invalid email address")
            row["email"] = email
        elif key == "phone" or key == "emergency_phone":
            row[key] = str(val).strip() if val is not None else ""
        elif key in ("given_name", "family_name", "emergency_name", "preferred_language"):
            row[key] = str(val).strip() if val is not None else ""
        else:
            row[key] = val

    row["updated_at"] = time.time()

    if "given_name" in data or "family_name" in data:
        try:
            await update_patient_demographics(
                pid,
                given_name=row.get("given_name"),
                family_name=row.get("family_name"),
            )
            await delete_summary_cache(pid)
        except Exception:
            pass  # portal row saved; FHIR store optional when Postgres unavailable

    state.ui_actions.insert(
        0,
        {
            "role": "patient",
            "patient_id": pid,
            "label": f"Profile updated: {row.get('given_name')} {row.get('family_name')}",
            "type": "profile_update",
            "ts": state.now_ts(),
        },
    )
    return _public_profile(row, pid)


@router.post("/{patient_id}/security/change-password")
def change_password(patient_id: str, body: ChangePasswordBody):
    pid = patient_id.strip()
    if not pid:
        raise HTTPException(400, "patient_id required")

    row = state.get_or_create_portal_profile(pid)
    count = int(row.get("password_change_count") or 0)
    if count >= MAX_PASSWORD_CHANGES:
        raise HTTPException(
            403,
            f"Password change limit reached ({MAX_PASSWORD_CHANGES} changes allowed for this account). "
            "Contact UniHealth support to reset your credentials.",
        )

    stored = str(row.get("password_hash") or "")
    if not stored:
        raise HTTPException(400, "No password set for this account. Contact support.")
    if not verify_password(body.current_password, stored):
        raise HTTPException(401, "Current password is incorrect.")

    if body.new_password != body.confirm_password:
        raise HTTPException(400, "New password and confirmation do not match.")
    if body.new_password == body.current_password:
        raise HTTPException(400, "New password must be different from your current password.")
    if len(body.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(400, f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")

    row["password_hash"] = hash_password(body.new_password)
    row["password_change_count"] = count + 1
    row["updated_at"] = time.time()

    state.ui_actions.insert(
        0,
        {
            "role": "patient",
            "patient_id": pid,
            "label": "Portal password changed",
            "type": "password_change",
            "ts": state.now_ts(),
        },
    )
    remaining = max(0, MAX_PASSWORD_CHANGES - row["password_change_count"])
    return {
        "ok": True,
        "message": "Password updated successfully.",
        "password_changes_used": row["password_change_count"],
        "password_changes_remaining": remaining,
    }
