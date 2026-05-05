import time

from fastapi import APIRouter, Body, HTTPException, Query

from app.state import now_ts, pharmacy_audit, pharmacy_prescriptions, pharmacy_stock

router = APIRouter(prefix="/pharmacy")


@router.get("/prescriptions", status_code=200, summary="List pharmacy prescriptions (Phase 1 UI).")
async def pharmacy_list_prescriptions(limit: int = Query(default=200, ge=1, le=500)):
    return pharmacy_prescriptions[:limit]


@router.post("/prescriptions/{rx_id}/verify", status_code=200, summary="Verify a prescription (Phase 1 UI).")
async def pharmacy_verify(rx_id: str):
    for r in pharmacy_prescriptions:
        if str(r.get("id")) == rx_id:
            r["verified"] = True
            r["status"] = "Verified"
            pharmacy_audit.insert(
                0,
                {
                    "ts": now_ts(),
                    "action": "Verify",
                    "user": "Pharmacy User",
                    "detail": f"{rx_id} verified",
                    "status": "LOGGED",
                },
            )
            return {"status": "verified", "id": rx_id}
    raise HTTPException(status_code=404, detail="Prescription not found")


@router.post("/prescriptions/{rx_id}/dispense", status_code=200, summary="Dispense a prescription (Phase 1 UI).")
async def pharmacy_dispense(rx_id: str):
    for r in pharmacy_prescriptions:
        if str(r.get("id")) == rx_id:
            r["status"] = "Dispensed"
            pharmacy_audit.insert(
                0,
                {
                    "ts": now_ts(),
                    "action": "Dispense",
                    "user": "Pharmacy User",
                    "detail": f"{rx_id} dispensed",
                    "status": "LOGGED",
                },
            )
            return {"status": "dispensed", "id": rx_id}
    raise HTTPException(status_code=404, detail="Prescription not found")


@router.get("/stock", status_code=200, summary="List pharmacy stock (Phase 1 UI).")
async def pharmacy_list_stock(limit: int = Query(default=300, ge=1, le=1000)):
    return pharmacy_stock[:limit]


@router.post("/stock/adjust", status_code=200, summary="Adjust stock (Phase 1 UI).")
async def pharmacy_adjust_stock(payload: dict = Body(...)):
    name = (payload.get("name") or "").strip()
    qty = payload.get("qty")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if not isinstance(qty, int):
        raise HTTPException(status_code=400, detail="qty must be an integer")
    for s in pharmacy_stock:
        if str(s.get("name", "")).strip().lower() == name.lower():
            s["qty"] = qty
            pharmacy_audit.insert(
                0,
                {
                    "ts": now_ts(),
                    "action": "Stock Adjust",
                    "user": "Pharmacy User",
                    "detail": f"{name} adjusted to {qty}",
                    "status": "LOGGED",
                },
            )
            return {"status": "updated", "id": name}
    pharmacy_stock.insert(
        0,
        {
            "name": name,
            "qty": qty,
            "min": int(payload.get("min") or 0),
            "unit": (payload.get("unit") or "").strip() or "units",
        },
    )
    return {"status": "created", "id": name}


@router.get("/audit", status_code=200, summary="List pharmacy audit entries (Phase 1 UI).")
async def pharmacy_list_audit(limit: int = Query(default=200, ge=1, le=500)):
    return pharmacy_audit[:limit]

