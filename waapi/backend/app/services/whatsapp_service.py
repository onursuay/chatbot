"""WhatsApp Cloud API service — tenant-aware mesaj gonderimi.
whatsapp_bot.py'den refactor edildi.
"""

import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


async def send_message(
    phone_number_id: str,
    access_token: str,
    to: str,
    text: str,
) -> dict | None:
    """Text mesaj gonder."""
    url = f"{settings.graph_api_base}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": text},
    }
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(url, headers=headers, json=payload)
            data = resp.json()
            logger.info(f"WhatsApp API yanit [{resp.status_code}] -> {to}: {data}")
            if "messages" in data:
                logger.info(f"Mesaj basariyla gonderildi -> {to}, msg_id: {data['messages'][0].get('id')}")
                return data
            logger.error(f"Mesaj gonderilemedi -> {to}: status={resp.status_code}, response={data}")
            return None
    except httpx.TimeoutException:
        logger.error(f"WhatsApp API timeout -> {to}, phone_number_id={phone_number_id}")
        return None
    except Exception as e:
        logger.error(f"WhatsApp API exception -> {to}: {type(e).__name__}: {e}")
        return None


async def send_template(
    phone_number_id: str,
    access_token: str,
    to: str,
    template_name: str,
    language_code: str = "tr",
    components: list | None = None,
) -> dict | None:
    """Template mesaj gonder."""
    url = f"{settings.graph_api_base}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    template = {"name": template_name, "language": {"code": language_code}}
    if components:
        template["components"] = components

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": template,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, json=payload)
        data = resp.json()
        if "messages" in data:
            logger.info(f"Template gonderildi -> {to}")
            return data
        logger.warning(f"Template gonderilemedi -> {to}: {data}")
        return None


async def mark_as_read(
    phone_number_id: str,
    access_token: str,
    message_id: str,
) -> None:
    """Mesaji okundu olarak isaretle."""
    url = f"{settings.graph_api_base}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": message_id,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            await client.post(url, headers=headers, json=payload)
        except Exception:
            pass


async def send_media(
    phone_number_id: str,
    access_token: str,
    to: str,
    media_type: str,
    media_url: str | None = None,
    media_id: str | None = None,
    caption: str | None = None,
) -> dict | None:
    """Medya mesaj gonder (image, video, audio, document)."""
    url = f"{settings.graph_api_base}/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    media_obj = {}
    if media_url:
        media_obj["link"] = media_url
    elif media_id:
        media_obj["id"] = media_id
    if caption:
        media_obj["caption"] = caption

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": media_type,
        media_type: media_obj,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers, json=payload)
        data = resp.json()
        if "messages" in data:
            return data
        logger.warning(f"Medya gonderilemedi -> {to}: {data}")
        return None
