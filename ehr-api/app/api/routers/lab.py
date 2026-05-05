import time

from fastapi import APIRouter, Body, HTTPException, Query

from app.state import lab_imaging, lab_orders, lab_qc, lab_results

router = APIRouter(prefix="/lab")


@router.get("/orders", status_code=200, summary="List lab orders (Phase 1 UI).")
async def lab_list_orders(limit: int = Query(default=200, ge=1, le=500)):
    return lab_orders[:limit]


@router.post("/orders", status_code=200, summary="Create a lab order (Phase 1 UI).")
async def lab_create_order(payload: dict = Body(...)):
    panel = (payload.get("panel") or "").strip()
    if not panel:
        raise HTTPException(status_code=400, detail="panel is required")
    order_id = payload.get("id") or f"LABORD-{int(time.time() * 1000)}"
    row = {
        "id": order_id,
        "patient_id": (payload.get("patient_id") or "").strip() or None,
        "afl_id": (payload.get("afl_id") or "").strip() or None,
        "panel": panel,
        "priority": (payload.get("priority") or "").strip() or "Routine",
        "status": (payload.get("status") or "").strip() or "Requested",
        "requested_at": payload.get("requested_at") or time.strftime("%Y-%m-%d %H:%M"),
    }
    lab_orders.insert(0, row)
    return {"status": "created", "id": order_id}


@router.get("/results", status_code=200, summary="List lab results (Phase 1 UI).")
async def lab_list_results(limit: int = Query(default=200, ge=1, le=500)):
    return lab_results[:limit]


@router.get("/qc", status_code=200, summary="List lab QC checks (Phase 1 UI).")
async def lab_list_qc(limit: int = Query(default=200, ge=1, le=500)):
    return lab_qc[:limit]


@router.get("/imaging", status_code=200, summary="List imaging worklist (Phase 1 UI).")
async def lab_list_imaging(limit: int = Query(default=200, ge=1, le=500)):
    return lab_imaging[:limit]


@router.post("/imaging", status_code=200, summary="Create imaging order/worklist item (Phase 1 UI).")
async def lab_create_imaging(payload: dict = Body(...)):
    study = (payload.get("study") or "").strip()
    modality = (payload.get("modality") or "").strip()
    if not study:
        raise HTTPException(status_code=400, detail="study is required")
    if not modality:
        raise HTTPException(status_code=400, detail="modality is required")
    img_id = payload.get("id") or f"IMG-{int(time.time() * 1000)}"
    row = {
        "id": img_id,
        "patient_id": (payload.get("patient_id") or "").strip() or None,
        "study": study,
        "modality": modality,
        "status": (payload.get("status") or "").strip() or "Pending read",
        "ts": payload.get("ts") or time.strftime("%Y-%m-%d %H:%M"),
    }
    lab_imaging.insert(0, row)
    return {"status": "created", "id": img_id}

