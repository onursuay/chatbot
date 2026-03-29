"""WebSocket endpoint — inbox gercek zamanli guncellemeler."""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query

from app.utils.security import decode_token
from app.websocket.manager import ws_manager

router = APIRouter()


@router.websocket("/ws/inbox")
async def inbox_websocket(websocket: WebSocket, token: str = Query(...)):
    """Takim inbox WebSocket baglantisi. Token ile auth yapilir."""

    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Gecersiz token")
        return

    org_id = payload.get("org_id")
    if not org_id:
        await websocket.close(code=4001, reason="Org bulunamadi")
        return

    await ws_manager.connect(websocket, org_id)

    try:
        while True:
            # Client'tan gelen mesajlari dinle (ping/pong, typing indicator vs.)
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, org_id)
