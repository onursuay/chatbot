"""Multi-tenant webhook router — WABA ID ile tenant esleme.
Tek webhook URL, tum musterilerin mesajlari buraya gelir.
"""

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.waba import WABAAccount, PhoneNumber
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.message import Message
from app.services import whatsapp_service, ai_service
from app.utils.security import decrypt_token

logger = logging.getLogger(__name__)
REQUEST_CONTACT_TAG = "[REQUEST_CONTACT]"
CONTACT_REQUEST_MESSAGE = (
    "Dilerseniz iletişim bilgilerinizi iletin, proje yetkilimiz detaylı bilgi vermek için sizi en kısa sürede arasın."
)


def _parse_ai_response(ai_response: str) -> tuple[bool, bool, bool, str]:
    request_contact = REQUEST_CONTACT_TAG in ai_response
    transfer_to_sales = "[TRANSFER_SALES]" in ai_response
    not_interested = "[NOT_INTERESTED]" in ai_response
    clean_response = (
        CONTACT_REQUEST_MESSAGE
        if request_contact
        else ai_response.replace("[TRANSFER_SALES]", "")
        .replace("[NOT_INTERESTED]", "")
        .replace(REQUEST_CONTACT_TAG, "")
        .strip()
    )
    return request_contact, transfer_to_sales, not_interested, clean_response


def _normalize_moderation_text(text: str) -> tuple[str, str, set[str]]:
    spaced = (
        text.lower()
        .replace("ç", "c")
        .replace("ğ", "g")
        .replace("ı", "i")
        .replace("ö", "o")
        .replace("ş", "s")
        .replace("ü", "u")
    )
    normalized = " ".join("".join(ch if ch.isalnum() else " " for ch in spaced).split())
    return normalized, normalized.replace(" ", ""), set(normalized.split()) if normalized else set()


def _contains_profanity(text: str, profanity_words: list[str]) -> bool:
    normalized_text, compact_text, token_set = _normalize_moderation_text(text)
    if not normalized_text and not compact_text:
        return False

    for candidate in profanity_words:
        normalized_candidate, compact_candidate, _ = _normalize_moderation_text(candidate)
        if not compact_candidate:
            continue
        if " " in normalized_candidate:
            if normalized_candidate in normalized_text or compact_candidate in compact_text:
                return True
            continue
        if len(compact_candidate) <= 3:
            if compact_candidate in token_set:
                return True
            continue
        if (
            compact_candidate in token_set
            or normalized_candidate in normalized_text
            or compact_candidate in compact_text
        ):
            return True
    return False


async def _get_profanity_action(
    db: AsyncSession,
    org_id: uuid.UUID,
    conversation: Conversation,
    text: str,
) -> dict | None:
    result = await db.execute(
        select(ai_service.ChatbotConfig).where(
            ai_service.ChatbotConfig.org_id == org_id,
            ai_service.ChatbotConfig.is_active == True,
        )
    )
    config = result.scalar_one_or_none()

    settings = ai_service.build_default_chatbot_settings(
        config.settings if config and isinstance(config.settings, dict) else {}
    )
    if config and settings != (config.settings or {}):
        config.settings = settings
        await db.flush()

    profanity_words = settings.get("profanity_words", [])
    if not _contains_profanity(text, profanity_words):
        return None

    metadata = dict(conversation.extra_data or {})
    count = int(metadata.get("profanity_count", 0)) + 1
    threshold = max(int(settings.get("profanity_close_threshold", ai_service.DEFAULT_PROFANITY_CLOSE_THRESHOLD)), 2)
    should_close = count >= threshold
    now_iso = datetime.now(timezone.utc).isoformat()

    return {
        "should_close": should_close,
        "reply_text": (
            settings.get("profanity_close_message")
            if should_close
            else settings.get("profanity_warning_message")
        ),
        "metadata": {
            **metadata,
            "profanity_count": count,
            "profanity_detected": True,
            "last_profanity_at": now_iso,
            "last_profanity_message": text[:200],
            "profanity_closed_at": now_iso if should_close else metadata.get("profanity_closed_at"),
        },
    }


async def route_webhook(payload: dict, db: AsyncSession) -> None:
    """Webhook payload'ini parse et ve dogru tenant'a yonlendir."""

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            metadata = value.get("metadata", {}) or {}
            phone_number_id_str = metadata.get("phone_number_id")
            display_phone_number = metadata.get("display_phone_number")

            logger.info(
                "[WHATSAPP][NORMALIZED] %s",
                {
                    "entry_id": entry.get("id"),
                    "field": change.get("field"),
                    "phone_number_id": phone_number_id_str,
                    "display_phone_number": display_phone_number,
                    "messages_count": len(value.get("messages", []) or []),
                    "statuses_count": len(value.get("statuses", []) or []),
                },
            )

            if not phone_number_id_str:
                continue

            # Phone number -> WABA -> org mapping'i bul
            result = await db.execute(
                select(PhoneNumber).where(
                    or_(
                        PhoneNumber.phone_number_id == phone_number_id_str,
                        PhoneNumber.display_number == (display_phone_number or ""),
                    )
                )
            )
            phone = result.scalar_one_or_none()
            if not phone:
                logger.error(
                    "[WHATSAPP][ERROR] mapping_not_found %s",
                    {
                        "phone_number_id": phone_number_id_str,
                        "display_phone_number": display_phone_number,
                    },
                )
                continue

            result = await db.execute(
                select(WABAAccount).where(WABAAccount.id == phone.waba_id)
            )
            waba = result.scalar_one_or_none()
            if not waba:
                logger.error(
                    "[WHATSAPP][ERROR] mapping_not_found %s",
                    {
                        "phone_number_id": phone_number_id_str,
                        "display_phone_number": display_phone_number,
                    },
                )
                continue

            logger.info(
                "[WHATSAPP][MAPPING] %s",
                {
                    "phone_number_id": phone.phone_number_id,
                    "display_phone_number": phone.display_number,
                    "org_id": str(waba.org_id),
                    "waba_id": waba.waba_id,
                },
            )

            try:
                access_token = decrypt_token(waba.access_token)
            except Exception:
                access_token = waba.access_token

            # Gelen mesajlari isle
            contacts_data = value.get("contacts", [])
            for msg in value.get("messages", []):
                await _process_inbound_message(
                    db, waba, phone, access_token, msg, contacts_data
                )

            # Status update'leri isle (delivered, read)
            for status_update in value.get("statuses", []):
                await _process_status_update(db, waba.org_id, status_update)


async def _process_inbound_message(
    db: AsyncSession,
    waba: WABAAccount,
    phone: PhoneNumber,
    access_token: str,
    msg: dict,
    contacts_data: list,
) -> None:
    """Gelen mesaji isle — contact/conversation olustur, AI yanit, DB'ye kaydet."""

    msg_id = msg.get("id", "")
    sender_wa_id = msg.get("from", "")
    msg_type = msg.get("type", "")

    # Deduplikasyon — wa_message_id UNIQUE constraint
    existing = await db.execute(
        select(Message).where(Message.wa_message_id == msg_id)
    )
    if existing.scalar_one_or_none():
        return

    # Mesaj icerigini cikar
    text = _extract_text(msg, msg_type)
    if text is None:
        return

    # Gonderenin profil bilgisi
    sender_name = ""
    if contacts_data:
        sender_name = contacts_data[0].get("profile", {}).get("name", "")

    # Contact bul veya olustur
    contact = await _get_or_create_contact(db, waba.org_id, sender_wa_id, sender_name)

    # Conversation bul veya olustur
    conversation = await _get_or_create_conversation(db, waba.org_id, contact.id, phone.id)
    logger.info(
        "[WHATSAPP][CONVERSATION] %s",
        {
            "conversation_id": str(conversation.id),
            "contact_id": str(contact.id),
            "phone_number_id": phone.phone_number_id,
            "org_id": str(waba.org_id),
        },
    )

    # Mesaji DB'ye kaydet
    inbound_msg = Message(
        org_id=waba.org_id,
        conversation_id=conversation.id,
        contact_id=contact.id,
        wa_message_id=msg_id,
        direction="inbound",
        type=msg_type if msg_type in ("text", "image", "video", "audio", "document", "location") else "text",
        content={"body": text},
        status="received",
        sender_type="contact",
    )
    db.add(inbound_msg)
    logger.info(
        "[WHATSAPP][MESSAGE] %s",
        {
            "wa_message_id": msg_id,
            "conversation_id": str(conversation.id),
            "contact_id": str(contact.id),
            "type": msg_type,
            "direction": "inbound",
        },
    )

    # Conversation guncelle
    conversation.last_message_at = datetime.now(timezone.utc)
    conversation.last_message_preview = text[:200]
    conversation.unread_count += 1

    await db.flush()

    # Okundu bilgisi gonder
    await whatsapp_service.mark_as_read(phone.phone_number_id, access_token, msg_id)

    profanity_action = await _get_profanity_action(db, waba.org_id, conversation, text)
    if profanity_action:
        reply_text = profanity_action["reply_text"]
        result = await whatsapp_service.send_message(
            phone.phone_number_id, access_token, sender_wa_id, reply_text
        )

        wa_msg_id = None
        send_status = "failed"
        if result and "messages" in result:
            wa_msg_id = result["messages"][0].get("id")
            send_status = "sent"

        outbound_msg = Message(
            org_id=waba.org_id,
            conversation_id=conversation.id,
            contact_id=contact.id,
            wa_message_id=wa_msg_id,
            direction="outbound",
            type="text",
            content={"body": reply_text},
            status=send_status,
            sender_type="bot",
        )
        db.add(outbound_msg)

        conversation.last_message_at = datetime.now(timezone.utc)
        conversation.last_message_preview = reply_text[:200]
        conversation.extra_data = profanity_action["metadata"]

        if profanity_action["should_close"]:
            conversation.status = "resolved"
            conversation.is_bot_active = False

        return

    # AI chatbot aktifse yanit uret
    if conversation.is_bot_active:
        ai_response = await ai_service.get_ai_response(
            db, str(waba.org_id), str(conversation.id), text
        )

        # Etiketleri temizle
        request_contact, transfer_to_sales, not_interested, clean_response = _parse_ai_response(
            ai_response
        )

        # Yaniti WhatsApp'a gonder
        logger.info(f"AI yaniti WhatsApp'a gonderiliyor -> {sender_wa_id}, phone_id={phone.phone_number_id}")
        result = await whatsapp_service.send_message(
            phone.phone_number_id, access_token, sender_wa_id, clean_response
        )

        # Yaniti DB'ye kaydet
        wa_msg_id = None
        send_status = "failed"
        if result and "messages" in result:
            wa_msg_id = result["messages"][0].get("id")
            send_status = "sent"
            logger.info(f"AI yaniti basariyla gonderildi -> {sender_wa_id}, wa_msg_id={wa_msg_id}")
        else:
            logger.error(f"AI yaniti gonderilemedi -> {sender_wa_id}, result={result}")

        outbound_msg = Message(
            org_id=waba.org_id,
            conversation_id=conversation.id,
            contact_id=contact.id,
            wa_message_id=wa_msg_id,
            direction="outbound",
            type="text",
            content={"body": clean_response},
            status=send_status,
            sender_type="bot",
        )
        db.add(outbound_msg)

        conversation.last_message_at = datetime.now(timezone.utc)
        conversation.last_message_preview = clean_response[:200]

        if transfer_to_sales:
            conversation.status = "open"
            conversation.is_bot_active = False
            logger.info(f"SATIS AKTARMA -> {sender_wa_id}")

        if not_interested:
            conversation.status = "resolved"
            conversation.is_bot_active = False


async def _process_status_update(db: AsyncSession, org_id: uuid.UUID, status_update: dict) -> None:
    """Mesaj durum guncelleme (delivered, read)."""
    wa_msg_id = status_update.get("id")
    new_status = status_update.get("status")  # sent, delivered, read, failed

    if not wa_msg_id or not new_status:
        return

    result = await db.execute(
        select(Message).where(Message.wa_message_id == wa_msg_id, Message.org_id == org_id)
    )
    msg = result.scalar_one_or_none()
    if msg:
        msg.status = new_status
        if new_status == "read":
            # Conversation unread_count sifirla
            result = await db.execute(
                select(Conversation).where(Conversation.id == msg.conversation_id)
            )
            conv = result.scalar_one_or_none()
            if conv:
                conv.unread_count = 0


def _extract_text(msg: dict, msg_type: str) -> str | None:
    """Mesaj tipine gore text cikar."""
    if msg_type == "text":
        return msg.get("text", {}).get("body", "")
    elif msg_type == "button":
        return msg.get("button", {}).get("text", "")
    elif msg_type == "interactive":
        interactive = msg.get("interactive", {})
        return (
            interactive.get("button_reply", {}).get("title", "")
            or interactive.get("list_reply", {}).get("title", "")
        )
    elif msg_type in ("image", "video", "audio", "document"):
        return msg.get(msg_type, {}).get("caption", "[medya]")
    return None


async def _get_or_create_contact(
    db: AsyncSession, org_id: uuid.UUID, wa_id: str, name: str
) -> Contact:
    """Contact bul veya olustur."""
    result = await db.execute(
        select(Contact).where(Contact.org_id == org_id, Contact.wa_id == wa_id)
    )
    contact = result.scalar_one_or_none()
    if contact:
        if name and not contact.name:
            contact.name = name
            contact.profile_name = name
        contact.last_message_at = datetime.now(timezone.utc)
        return contact

    contact = Contact(
        org_id=org_id,
        wa_id=wa_id,
        phone=f"+{wa_id}",
        name=name or None,
        profile_name=name or None,
        last_message_at=datetime.now(timezone.utc),
    )
    db.add(contact)
    await db.flush()
    return contact


async def _get_or_create_conversation(
    db: AsyncSession, org_id: uuid.UUID, contact_id: uuid.UUID, phone_number_id: uuid.UUID
) -> Conversation:
    """Acik conversation bul veya yeni olustur."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.org_id == org_id,
            Conversation.contact_id == contact_id,
            Conversation.status.in_(["open", "assigned"]),
        )
    )
    conv = result.scalar_one_or_none()
    if conv:
        return conv

    conv = Conversation(
        org_id=org_id,
        contact_id=contact_id,
        phone_number_id=phone_number_id,
        status="open",
        is_bot_active=True,
    )
    db.add(conv)
    await db.flush()
    return conv
