"""Message modeli."""

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Message(Base, TimestampMixin):
    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    contact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contacts.id"), nullable=False
    )
    wa_message_id: Mapped[str | None] = mapped_column(String(200), unique=True)  # Meta message ID (deduplikasyon)
    direction: Mapped[str] = mapped_column(String(10), nullable=False)  # inbound, outbound
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # text, image, video, audio, document, template, interactive, location, reaction
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)  # {"body": "..."} veya {"media_url": "...", "caption": "..."}
    status: Mapped[str] = mapped_column(String(20), default="sent")  # sent, delivered, read, failed
    sender_type: Mapped[str | None] = mapped_column(String(20))  # contact, agent, bot, system, broadcast
    sender_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))  # user_id eger agent ise
    error_code: Mapped[str | None] = mapped_column(String(20))
    error_message: Mapped[str | None] = mapped_column(Text)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
