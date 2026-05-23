"""In-memory list CRUD helpers for Phase 1 UI stores."""

from __future__ import annotations

from typing import Any


def find_index(items: list[dict[str, Any]], item_id: str, id_key: str = "id") -> int | None:
    for i, row in enumerate(items):
        if str(row.get(id_key)) == str(item_id):
            return i
    return None


def get_one(items: list[dict[str, Any]], item_id: str, id_key: str = "id") -> dict[str, Any] | None:
    idx = find_index(items, item_id, id_key)
    if idx is None:
        return None
    return items[idx]


def update_one(items: list[dict[str, Any]], item_id: str, patch: dict[str, Any], id_key: str = "id") -> bool:
    idx = find_index(items, item_id, id_key)
    if idx is None:
        return False
    items[idx].update(patch)
    return True


def delete_one(items: list[dict[str, Any]], item_id: str, id_key: str = "id") -> bool:
    idx = find_index(items, item_id, id_key)
    if idx is None:
        return False
    items.pop(idx)
    return True
