import time

from fastapi import APIRouter, Body, Query

from app.state import (
    nurse_fluid_entries,
    nurse_handover_notes,
    nurse_incidents,
    nurse_supply_requests,
    nurse_tasks,
    nurse_wound_entries,
)

router = APIRouter(prefix="/nurse")


@router.post("/incidents", status_code=200, summary="Create a nurse incident report (Phase 1 UI).")
async def nurse_create_incident(payload: dict = Body(...)):
    incident_id = payload.get("id") or f"INC-{int(time.time() * 1000)}"
    row = {"id": incident_id, **payload, "created_at": time.time()}
    nurse_incidents.insert(0, row)
    return {"status": "created", "id": incident_id}


@router.get("/incidents", status_code=200, summary="List nurse incident reports (Phase 1 UI).")
async def nurse_list_incidents(limit: int = Query(default=50, ge=1, le=200)):
    return nurse_incidents[:limit]


@router.post("/supplies", status_code=200, summary="Create a nurse supply request (Phase 1 UI).")
async def nurse_create_supply(payload: dict = Body(...)):
    req_id = payload.get("id") or f"SUP-{int(time.time() * 1000)}"
    row = {"id": req_id, **payload, "created_at": time.time()}
    nurse_supply_requests.insert(0, row)
    return {"status": "created", "id": req_id}


@router.get("/supplies", status_code=200, summary="List nurse supply requests (Phase 1 UI).")
async def nurse_list_supplies(limit: int = Query(default=50, ge=1, le=200)):
    return nurse_supply_requests[:limit]


@router.post("/tasks", status_code=200, summary="Create a nurse task (Phase 1 UI).")
async def nurse_create_task(payload: dict = Body(...)):
    task_id = payload.get("id") or f"TASK-{int(time.time() * 1000)}"
    row = {
        "id": task_id,
        "patient_id": payload.get("patient_id"),
        "title": payload.get("title"),
        "due": payload.get("due"),
        "status": payload.get("status", "pending"),
        "created_at": time.time(),
    }
    nurse_tasks.insert(0, row)
    return {"status": "created", "id": task_id}


@router.get("/tasks", status_code=200, summary="List nurse tasks (Phase 1 UI).")
async def nurse_list_tasks(limit: int = Query(default=100, ge=1, le=500)):
    return nurse_tasks[:limit]


@router.post("/tasks/complete", status_code=200, summary="Complete a nurse task (Phase 1 UI).")
async def nurse_complete_task(payload: dict = Body(...)):
    task_id = payload.get("id")
    for t in nurse_tasks:
        if str(t.get("id")) == str(task_id):
            t["status"] = "done"
            t["completed_at"] = time.time()
            return {"status": "completed", "id": task_id}
    return {"status": "not_found", "id": task_id}


@router.post("/fluids", status_code=200, summary="Create a fluid balance entry (Phase 1 UI).")
async def nurse_create_fluid(payload: dict = Body(...)):
    entry_id = payload.get("id") or f"FLD-{int(time.time() * 1000)}"
    row = {"id": entry_id, **payload, "created_at": time.time()}
    nurse_fluid_entries.insert(0, row)
    return {"status": "created", "id": entry_id}


@router.get("/fluids", status_code=200, summary="List fluid balance entries (Phase 1 UI).")
async def nurse_list_fluids(limit: int = Query(default=100, ge=1, le=500)):
    return nurse_fluid_entries[:limit]


@router.post("/wounds", status_code=200, summary="Create a wound/dressing entry (Phase 1 UI).")
async def nurse_create_wound(payload: dict = Body(...)):
    entry_id = payload.get("id") or f"WND-{int(time.time() * 1000)}"
    row = {"id": entry_id, **payload, "created_at": time.time()}
    nurse_wound_entries.insert(0, row)
    return {"status": "created", "id": entry_id}


@router.get("/wounds", status_code=200, summary="List wound/dressing entries (Phase 1 UI).")
async def nurse_list_wounds(limit: int = Query(default=100, ge=1, le=500)):
    return nurse_wound_entries[:limit]


@router.post("/handover", status_code=200, summary="Submit/sign handover notes (Phase 1 UI).")
async def nurse_submit_handover(payload: dict = Body(...)):
    note_id = payload.get("id") or f"HND-{int(time.time() * 1000)}"
    row = {"id": note_id, **payload, "created_at": time.time()}
    nurse_handover_notes.insert(0, row)
    return {"status": "submitted", "id": note_id}


@router.get("/handover", status_code=200, summary="List handover submissions (Phase 1 UI).")
async def nurse_list_handover(limit: int = Query(default=50, ge=1, le=200)):
    return nurse_handover_notes[:limit]

