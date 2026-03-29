"""Meta WhatsApp webhook — tek endpoint, tum tenant'lar icin."""

import logging

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.config import get_settings
from app.db.session import get_db
from app.services.webhook_router import route_webhook

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/meta", response_class=PlainTextResponse)
async def verify_webhook(request: Request):
    """Meta webhook dogrulama (GET). Tek seferlik cagrilir."""
    settings = get_settings()
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == settings.META_WEBHOOK_VERIFY_TOKEN:
        logger.info("Webhook dogrulandi")
        return challenge

    logger.warning(f"Webhook dogrulama basarisiz — token: {token}")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/meta")
async def receive_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Meta webhook (POST). Tum tenant mesajlari buraya gelir, WABA ID ile yonlendirilir."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    logger.info(f"Webhook alindi: {str(body)[:300]}")

    try:
        await route_webhook(body, db)
    except Exception as e:
        logger.error(f"Webhook isleme hatasi: {type(e).__name__}: {e}", exc_info=True)
        # Meta 200 bekler, 500 donerse tekrar tekrar dener
        # Bu yuzden hatayi loglayip 200 donuyoruz
    return {"status": "ok"}
