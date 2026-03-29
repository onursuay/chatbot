"""Message ve Conversation schemalar\u0131."""

from datetime import datetime
from pydantic import BaseModel


class SendMessageRequest(BaseModel):
    text: str
    type: str = "text"


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    direction: str
    type: str
    content: dict
    status: str
    sender_type: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: str
    contact_id: str
    contact_name: str | None = None
    contact_phone: str | None = None
    status: str
    assigned_to: str | None
    labels: list[str]
    last_message_at: datetime | None
    last_message_preview: str | None
    unread_count: int
    is_bot_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationUpdateRequest(BaseModel):
    status: str | None = None
    assigned_to: str | None = None
    labels: list[str] | None = None
    is_bot_active: bool | None = None


class ContactResponse(BaseModel):
    id: str
    wa_id: str
    phone: str
    name: str | None
    profile_name: str | None
    email: str | None
    tags: list[str]
    last_message_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactCreateRequest(BaseModel):
    phone: str
    name: str | None = None
    email: str | None = None
    tags: list[str] = []


class StartConversationRequest(BaseModel):
    phone: str  # +905xxxxxxxxx formatinda
    name: str | None = None
    text: str
