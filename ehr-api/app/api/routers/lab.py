import time

from fastapi import APIRouter, Body, HTTPException, Query

from app.list_crud import delete_one, update_one
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


@router.put("/orders/{order_id}", status_code=200, summary="Update a lab order (Phase 1 UI).")
async def lab_update_order(order_id: str, payload: dict = Body(...)):
    if not update_one(lab_orders, order_id, payload):
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "updated", "id": order_id}


@router.delete("/orders/{order_id}", status_code=200, summary="Delete a lab order (Phase 1 UI).")
async def lab_delete_order(order_id: str):
    if not delete_one(lab_orders, order_id):
        raise HTTPException(status_code=404, detail="Order not found")
    return {"status": "deleted", "id": order_id}


@router.post("/results", status_code=200, summary="Create a lab result (Phase 1 UI).")
async def lab_create_result(payload: dict = Body(...)):
    analyte = (payload.get("analyte") or payload.get("test") or "").strip()
    if not analyte:
        raise HTTPException(status_code=400, detail="analyte is required")
    result_id = payload.get("id") or f"LABRES-{int(time.time() * 1000)}"
    row = {
        "id": result_id,
        "patient_id": (payload.get("patient_id") or "").strip() or None,
        "order_id": (payload.get("order_id") or "").strip() or None,
        "analyte": analyte,
        "value": (payload.get("value") or "").strip() or "—",
        "unit": (payload.get("unit") or "").strip() or "",
        "flag": (payload.get("flag") or "").strip() or "normal",
        "ts": payload.get("ts") or time.strftime("%Y-%m-%d %H:%M"),
    }
    lab_results.insert(0, row)
    return {"status": "created", "id": result_id}


@router.put("/results/{result_id}", status_code=200, summary="Update a lab result (Phase 1 UI).")
async def lab_update_result(result_id: str, payload: dict = Body(...)):
    if not update_one(lab_results, result_id, payload):
        raise HTTPException(status_code=404, detail="Result not found")
    return {"status": "updated", "id": result_id}


@router.delete("/results/{result_id}", status_code=200, summary="Delete a lab result (Phase 1 UI).")
async def lab_delete_result(result_id: str):
    if not delete_one(lab_results, result_id):
        raise HTTPException(status_code=404, detail="Result not found")
    return {"status": "deleted", "id": result_id}


@router.post("/qc", status_code=200, summary="Create a QC check (Phase 1 UI).")
async def lab_create_qc(payload: dict = Body(...)):
    instrument = (payload.get("instrument") or "").strip()
    if not instrument:
        raise HTTPException(status_code=400, detail="instrument is required")
    qc_id = payload.get("id") or f"QC-{int(time.time() * 1000)}"
    row = {
        "id": qc_id,
        "instrument": instrument,
        "check": (payload.get("check") or "").strip() or "Daily QC",
        "status": (payload.get("status") or "").strip() or "Pass",
        "ts": payload.get("ts") or time.strftime("%Y-%m-%d %H:%M"),
    }
    lab_qc.insert(0, row)
    return {"status": "created", "id": qc_id}


@router.put("/qc/{qc_id}", status_code=200, summary="Update a QC check (Phase 1 UI).")
async def lab_update_qc(qc_id: str, payload: dict = Body(...)):
    if not update_one(lab_qc, qc_id, payload):
        raise HTTPException(status_code=404, detail="QC check not found")
    return {"status": "updated", "id": qc_id}


@router.delete("/qc/{qc_id}", status_code=200, summary="Delete a QC check (Phase 1 UI).")
async def lab_delete_qc(qc_id: str):
    if not delete_one(lab_qc, qc_id):
        raise HTTPException(status_code=404, detail="QC check not found")
    return {"status": "deleted", "id": qc_id}


@router.put("/imaging/{img_id}", status_code=200, summary="Update imaging worklist item (Phase 1 UI).")
async def lab_update_imaging(img_id: str, payload: dict = Body(...)):
    if not update_one(lab_imaging, img_id, payload):
        raise HTTPException(status_code=404, detail="Imaging item not found")
    return {"status": "updated", "id": img_id}


@router.delete("/imaging/{img_id}", status_code=200, summary="Delete imaging worklist item (Phase 1 UI).")
async def lab_delete_imaging(img_id: str):
    if not delete_one(lab_imaging, img_id):
        raise HTTPException(status_code=404, detail="Imaging item not found")
    return {"status": "deleted", "id": img_id}

