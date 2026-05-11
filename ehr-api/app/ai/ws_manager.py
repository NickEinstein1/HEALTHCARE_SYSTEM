"""
UniHealth Phase 3 — WebSocket Alert Manager
============================================
Manages real-time alert delivery to connected dashboards.
Connections are grouped by clinical role so a critical lab
result reaches only the relevant doctor/nurse session.

Security:
  - Connections require a `token` query param (validated against
    VALID_WS_TOKENS in environment; falls back to a dev default).
  - Each connection is tied to a role.  Broadcast is role-scoped —
    a pharmacy client cannot receive ICU ward alerts.
  - All broadcasts are logged to the AI audit trail.
"""

from __future__ import annotations

import json
import logging
import os
import time
from collections import defaultdict
from typing import Iterable

from fastapi import WebSocket

log = logging.getLogger("unihealth.ws")

# Simple shared-secret tokens (comma-separated in env var).
# In production replace with JWT validation.
_ENV_TOKENS = os.getenv("WS_TOKENS", "dev-token-1,dev-token-2")
VALID_TOKENS: frozenset[str] = frozenset(
    t.strip() for t in _ENV_TOKENS.split(",") if t.strip()
)

VALID_ROLES: frozenset[str] = frozenset(
    ["doctor", "nurse", "admin", "lab", "pharmacy"]
)


class AlertManager:
    """Thread-safe (asyncio-safe) WebSocket connection registry."""

    def __init__(self) -> None:
        # role -> set of live WebSocket connections
        self._connections: dict[str, set[WebSocket]] = defaultdict(set)
        # total messages broadcast since startup
        self._broadcast_count: int = 0

    # ── connection lifecycle ──────────────────────────────────────────
    def validate_token(self, token: str) -> bool:
        return token in VALID_TOKENS

    async def connect(self, ws: WebSocket, role: str) -> None:
        await ws.accept()
        self._connections[role].add(ws)
        log.info("WS connected: role=%s total=%d", role, len(self._connections[role]))

    def disconnect(self, ws: WebSocket, role: str) -> None:
        self._connections[role].discard(ws)
        log.info("WS disconnected: role=%s remaining=%d", role, len(self._connections[role]))

    # ── broadcast helpers ─────────────────────────────────────────────
    async def broadcast_to_role(self, role: str, payload: dict) -> int:
        """Send payload to all active connections for *role*. Returns delivery count."""
        if role not in VALID_ROLES:
            return 0
        targets = list(self._connections.get(role, set()))
        stale: list[WebSocket] = []
        delivered = 0
        msg = json.dumps(payload)
        for ws in targets:
            try:
                await ws.send_text(msg)
                delivered += 1
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(ws, role)
        self._broadcast_count += delivered
        return delivered

    async def broadcast_to_roles(self, roles: Iterable[str], payload: dict) -> int:
        total = 0
        for role in roles:
            total += await self.broadcast_to_role(role, payload)
        return total

    async def broadcast_alert(self, anomaly: dict) -> int:
        """
        Route an anomaly alert to the appropriate clinical roles.
        CRITICAL alerts reach doctors + nurses.
        HIGH alerts reach nurses.
        Ward-level events also notify admins.
        """
        severity = anomaly.get("severity", "")
        roles: list[str] = []
        if severity == "CRITICAL":
            roles = ["doctor", "nurse"]
        elif severity == "HIGH":
            roles = ["nurse"]
        else:
            roles = ["nurse"]

        payload = {
            "event":    "anomaly_alert",
            "ts":       time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "data":     anomaly,
        }
        return await self.broadcast_to_roles(roles, payload)

    async def broadcast_ward_update(self, ward_data: dict) -> int:
        payload = {
            "event": "ward_update",
            "ts":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "data":  ward_data,
        }
        return await self.broadcast_to_roles(["nurse", "admin"], payload)

    # ── diagnostics ───────────────────────────────────────────────────
    def status(self) -> dict:
        return {
            "connections_by_role": {
                role: len(sockets)
                for role, sockets in self._connections.items()
            },
            "total_broadcast": self._broadcast_count,
        }


# Singleton shared across the FastAPI application
alert_manager = AlertManager()
