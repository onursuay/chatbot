"""WebSocket connection manager — gercek zamanli inbox."""

import json
import logging
from collections import defaultdict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Org bazli WebSocket baglanti yonetimi."""

    def __init__(self):
        # org_id -> list[WebSocket]
        self.connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, org_id: str):
        await websocket.accept()
        self.connections[org_id].append(websocket)
        logger.info(f"WS baglandi: org={org_id}, toplam={len(self.connections[org_id])}")

    def disconnect(self, websocket: WebSocket, org_id: str):
        if websocket in self.connections[org_id]:
            self.connections[org_id].remove(websocket)
        logger.info(f"WS ayrildi: org={org_id}")

    async def broadcast_to_org(self, org_id: str, event: str, data: dict):
        """Organizasyondaki tum bagli kullanicilara mesaj gonder."""
        message = json.dumps({"event": event, "data": data}, default=str)
        dead = []
        for ws in self.connections.get(org_id, []):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, org_id)


# Singleton
ws_manager = ConnectionManager()
