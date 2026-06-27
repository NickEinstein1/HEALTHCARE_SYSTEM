import time

from fastapi import APIRouter, Body, HTTPException, Query

from app.list_crud import delete_one, get_one, update_one
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
    row = {
        "id": incident_id,
        **payload,
        "status": (payload.get("status") or "").strip() or "Under Review",
        "created_at": time.time(),
    }
    nurse_incidents.insert(0, row)
    return {"status": "created", "id": incident_id}


@router.get("/incidents", status_code=200, summary="List nurse incident reports (Phase 1 UI).")
async def nurse_list_incidents(
    limit: int = Query(default=50, ge=1, le=200),
    patient_id: str | None = Query(default=None),
):
    rows = nurse_incidents[:]
    if patient_id:
        pid = patient_id.strip()
        rows = [r for r in rows if str(r.get("patient_id") or "").strip() == pid]
    return rows[:limit]


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


@router.get("/incidents/{incident_id}", status_code=200, summary="Get one incident (Phase 1 UI).")
async def nurse_get_incident(incident_id: str):
    row = get_one(nurse_incidents, incident_id)
    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")
    return row


@router.put("/incidents/{incident_id}", status_code=200, summary="Update an incident (Phase 1 UI).")
async def nurse_update_incident(incident_id: str, payload: dict = Body(...)):
    if not update_one(nurse_incidents, incident_id, {**payload, "updated_at": time.time()}):
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"status": "updated", "id": incident_id}


@router.delete("/incidents/{incident_id}", status_code=200, summary="Delete an incident (Phase 1 UI).")
async def nurse_delete_incident(incident_id: str):
    if not delete_one(nurse_incidents, incident_id):
        raise HTTPException(status_code=404, detail="Incident not found")
    return {"status": "deleted", "id": incident_id}


@router.put("/supplies/{req_id}", status_code=200, summary="Update a supply request (Phase 1 UI).")
async def nurse_update_supply(req_id: str, payload: dict = Body(...)):
    if not update_one(nurse_supply_requests, req_id, {**payload, "updated_at": time.time()}):
        raise HTTPException(status_code=404, detail="Supply request not found")
    return {"status": "updated", "id": req_id}


@router.delete("/supplies/{req_id}", status_code=200, summary="Delete a supply request (Phase 1 UI).")
async def nurse_delete_supply(req_id: str):
    if not delete_one(nurse_supply_requests, req_id):
        raise HTTPException(status_code=404, detail="Supply request not found")
    return {"status": "deleted", "id": req_id}


@router.put("/tasks/{task_id}", status_code=200, summary="Update a nurse task (Phase 1 UI).")
async def nurse_update_task(task_id: str, payload: dict = Body(...)):
    if not update_one(nurse_tasks, task_id, {**payload, "updated_at": time.time()}):
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "updated", "id": task_id}


@router.delete("/tasks/{task_id}", status_code=200, summary="Delete a nurse task (Phase 1 UI).")
async def nurse_delete_task(task_id: str):
    if not delete_one(nurse_tasks, task_id):
        raise HTTPException(status_code=404, detail="Task not found")
    return {"status": "deleted", "id": task_id}


@router.put("/fluids/{entry_id}", status_code=200, summary="Update a fluid entry (Phase 1 UI).")
async def nurse_update_fluid(entry_id: str, payload: dict = Body(...)):
    if not update_one(nurse_fluid_entries, entry_id, {**payload, "updated_at": time.time()}):
        raise HTTPException(status_code=404, detail="Fluid entry not found")
    return {"status": "updated", "id": entry_id}


@router.delete("/fluids/{entry_id}", status_code=200, summary="Delete a fluid entry (Phase 1 UI).")
async def nurse_delete_fluid(entry_id: str):
    if not delete_one(nurse_fluid_entries, entry_id):
        raise HTTPException(status_code=404, detail="Fluid entry not found")
    return {"status": "deleted", "id": entry_id}


@router.put("/wounds/{entry_id}", status_code=200, summary="Update a wound entry (Phase 1 UI).")
async def nurse_update_wound(entry_id: str, payload: dict = Body(...)):
    if not update_one(nurse_wound_entries, entry_id, {**payload, "updated_at": time.time()}):
        raise HTTPException(status_code=404, detail="Wound entry not found")
    return {"status": "updated", "id": entry_id}


@router.delete("/wounds/{entry_id}", status_code=200, summary="Delete a wound entry (Phase 1 UI).")
async def nurse_delete_wound(entry_id: str):
    if not delete_one(nurse_wound_entries, entry_id):
        raise HTTPException(status_code=404, detail="Wound entry not found")
    return {"status": "deleted", "id": entry_id}


@router.put("/handover/{note_id}", status_code=200, summary="Update handover notes (Phase 1 UI).")
async def nurse_update_handover(note_id: str, payload: dict = Body(...)):
    if not update_one(nurse_handover_notes, note_id, {**payload, "updated_at": time.time()}):
        raise HTTPException(status_code=404, detail="Handover note not found")
    return {"status": "updated", "id": note_id}


@router.delete("/handover/{note_id}", status_code=200, summary="Delete handover notes (Phase 1 UI).")
async def nurse_delete_handover(note_id: str):
    if not delete_one(nurse_handover_notes, note_id):
        raise HTTPException(status_code=404, detail="Handover note not found")
    return {"status": "deleted", "id": note_id}

