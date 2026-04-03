"""Conversations API — takim inbox backend'i."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.models.conversation import Conversation
from app.models.contact import Contact
from app.models.message import Message
from app.schemas.message import ConversationResponse, ConversationUpdateRequest, MessageResponse, SendMessageRequest, StartConversationRequest
from app.services import whatsapp_service
from app.models.waba import PhoneNumber, WABAAccount
from app.utils.security import decrypt_token

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(
    status: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Organizasyonun konusmalarini listele."""
    query = (
        select(Conversation)
        .where(Conversation.org_id == org.id)
        .order_by(Conversation.last_message_at.desc().nullslast())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    if status:
        query = query.where(Conversation.status == status)

    result = await db.execute(query)
    convs = result.scalars().all()

    responses = []
    for conv in convs:
        # Contact bilgisi
        contact_result = await db.execute(select(Contact).where(Contact.id == conv.contact_id))
        contact = contact_result.scalar_one_or_none()

        responses.append(ConversationResponse(
            id=str(conv.id),
            contact_id=str(conv.contact_id),
            contact_name=contact.name if contact else None,
            contact_phone=contact.phone if contact else None,
            status=conv.status,
            assigned_to=str(conv.assigned_to) if conv.assigned_to else None,
            labels=conv.labels or [],
            last_message_at=conv.last_message_at,
            last_message_preview=conv.last_message_preview,
            unread_count=conv.unread_count,
            is_bot_active=conv.is_bot_active,
            created_at=conv.created_at,
        ))
    return responses


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Konusmanin mesajlarini getir."""
    conv_uuid = uuid.UUID(conversation_id)

    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.org_id == org.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Konusma bulunamadi")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_uuid)
        .order_by(Message.created_at.asc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    messages = result.scalars().all()

    return [
        MessageResponse(
            id=str(m.id),
            conversation_id=str(m.conversation_id),
            direction=m.direction,
            type=m.type,
            content=m.content,
            status=m.status,
            sender_type=m.sender_type,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def send_message_endpoint(
    conversation_id: str,
    req: SendMessageRequest,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Agent olarak mesaj gonder."""
    conv_uuid = uuid.UUID(conversation_id)

    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.org_id == org.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Konusma bulunamadi")

    # Contact bilgisi
    contact_result = await db.execute(select(Contact).where(Contact.id == conv.contact_id))
    contact = contact_result.scalar_one()

    # Phone number + WABA token
    phone_result = await db.execute(select(PhoneNumber).where(PhoneNumber.id == conv.phone_number_id))
    phone = phone_result.scalar_one_or_none()
    if not phone:
        raise HTTPException(status_code=400, detail="Telefon numarasi bulunamadi")

    waba_result = await db.execute(select(WABAAccount).where(WABAAccount.id == phone.waba_id))
    waba = waba_result.scalar_one()
    try:
        access_token = decrypt_token(waba.access_token)
    except Exception:
        logger.warning("WABA access_token decrypt failed; using raw token for send_message")
        access_token = waba.access_token

    # WhatsApp'a gonder
    result = await whatsapp_service.send_message(
        phone.phone_number_id, access_token, contact.wa_id, req.text
    )

    wa_msg_id = None
    if result and "messages" in result:
        wa_msg_id = result["messages"][0].get("id")

    # DB'ye kaydet
    msg = Message(
        org_id=org.id,
        conversation_id=conv.id,
        contact_id=contact.id,
        wa_message_id=wa_msg_id,
        direction="outbound",
        type="text",
        content={"body": req.text},
        status="sent",
        sender_type="agent",
        sender_id=user.id,
    )
    db.add(msg)

    from datetime import datetime, timezone
    conv.last_message_at = datetime.now(timezone.utc)
    conv.last_message_preview = req.text[:200]
    conv.is_bot_active = False  # Agent yazinca bot devre disi

    await db.flush()

    return MessageResponse(
        id=str(msg.id),
        conversation_id=str(msg.conversation_id),
        direction=msg.direction,
        type=msg.type,
        content=msg.content,
        status=msg.status,
        sender_type=msg.sender_type,
        created_at=msg.created_at,
    )


@router.post("/start", response_model=ConversationResponse)
async def start_conversation(
    req: StartConversationRequest,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Yeni bir kisiyle konusma baslat — contact + conversation + ilk mesaj olusturur."""
    from datetime import datetime, timezone
    import re

    # Telefon numarasini normalize et (sadece rakamlar, + olmadan)
    wa_id = re.sub(r"[^0-9]", "", req.phone)
    if not wa_id or len(wa_id) < 10:
        raise HTTPException(status_code=400, detail="Gecersiz telefon numarasi")

    phone_display = req.phone if req.phone.startswith("+") else f"+{req.phone}"

    # Aktif phone number bul
    phone_result = await db.execute(
        select(PhoneNumber).where(PhoneNumber.org_id == org.id, PhoneNumber.is_active == True)
    )
    phone = phone_result.scalar_one_or_none()
    if not phone:
        raise HTTPException(status_code=400, detail="Aktif WhatsApp numarasi bulunamadi")

    # WABA token
    waba_result = await db.execute(select(WABAAccount).where(WABAAccount.id == phone.waba_id))
    waba = waba_result.scalar_one()
    try:
        access_token = decrypt_token(waba.access_token)
    except Exception:
        logger.warning("WABA access_token decrypt failed; using raw token for start_conversation")
        access_token = waba.access_token

    # Contact bul veya olustur
    contact_result = await db.execute(
        select(Contact).where(Contact.org_id == org.id, Contact.wa_id == wa_id)
    )
    contact = contact_result.scalar_one_or_none()

    if not contact:
        contact = Contact(
            org_id=org.id,
            wa_id=wa_id,
            phone=phone_display,
            name=req.name,
            profile_name=req.name,
        )
        db.add(contact)
        await db.flush()

    # Mevcut acik konusma var mi?
    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.org_id == org.id,
            Conversation.contact_id == contact.id,
            Conversation.phone_number_id == phone.id,
            Conversation.status != "resolved",
        )
    )
    conv = conv_result.scalar_one_or_none()

    if not conv:
        conv = Conversation(
            org_id=org.id,
            contact_id=contact.id,
            phone_number_id=phone.id,
            status="open",
            is_bot_active=False,
        )
        db.add(conv)
        await db.flush()

    # WhatsApp'a gonder
    result = await whatsapp_service.send_message(
        phone.phone_number_id, access_token, wa_id, req.text
    )

    wa_msg_id = None
    if result and "messages" in result:
        wa_msg_id = result["messages"][0].get("id")
    elif result:
        error_msg = str(result)
        raise HTTPException(status_code=400, detail=f"WhatsApp API hatasi: {error_msg[:200]}")
    else:
        raise HTTPException(status_code=500, detail="WhatsApp API'ye ulasilamadi")

    # Mesaji DB'ye kaydet
    msg = Message(
        org_id=org.id,
        conversation_id=conv.id,
        contact_id=contact.id,
        wa_message_id=wa_msg_id,
        direction="outbound",
        type="text",
        content={"body": req.text},
        status="sent",
        sender_type="agent",
        sender_id=user.id,
    )
    db.add(msg)

    now = datetime.now(timezone.utc)
    conv.last_message_at = now
    conv.last_message_preview = req.text[:200]
    contact.last_message_at = now

    await db.flush()

    return ConversationResponse(
        id=str(conv.id),
        contact_id=str(conv.contact_id),
        contact_name=contact.name,
        contact_phone=contact.phone,
        status=conv.status,
        assigned_to=str(conv.assigned_to) if conv.assigned_to else None,
        labels=conv.labels or [],
        last_message_at=conv.last_message_at,
        last_message_preview=conv.last_message_preview,
        unread_count=conv.unread_count,
        is_bot_active=conv.is_bot_active,
        created_at=conv.created_at,
    )


@router.patch("/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    req: ConversationUpdateRequest,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Konusma durumunu guncelle (atama, etiket, cozuldu vs.)."""
    conv_uuid = uuid.UUID(conversation_id)
    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_uuid, Conversation.org_id == org.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Konusma bulunamadi")

    if req.status is not None:
        conv.status = req.status
    if req.assigned_to is not None:
        conv.assigned_to = uuid.UUID(req.assigned_to) if req.assigned_to else None
    if req.labels is not None:
        conv.labels = req.labels
    if req.is_bot_active is not None:
        conv.is_bot_active = req.is_bot_active

    return {"status": "updated"}
