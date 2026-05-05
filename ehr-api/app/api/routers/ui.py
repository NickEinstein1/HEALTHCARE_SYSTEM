import time

from fastapi import APIRouter, Body, Query

from app.state import ui_actions

router = APIRouter()


@router.post("/ui/actions", status_code=200, summary="Record a UI action (Phase 1 UI).")
async def ui_record_action(payload: dict = Body(...)):
    action_id = payload.get("id") or f"ACT-{int(time.time() * 1000)}"
    row = {"id": action_id, **payload, "created_at": time.time()}
    ui_actions.insert(0, row)
    return {"status": "recorded", "id": action_id}


@router.get("/ui/actions", status_code=200, summary="List UI actions (Phase 1 UI).")
async def ui_list_actions(limit: int = Query(default=100, ge=1, le=500)):
    return ui_actions[:limit]

