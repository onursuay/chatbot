"""Chatbot config modeli — tenant basina AI ayarlari."""

import uuid

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class ChatbotConfig(Base, TimestampMixin):
    __tablename__ = "chatbot_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), default="Default Bot")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    ai_provider: Mapped[str] = mapped_column(String(20), default="gemini")
    ai_model: Mapped[str] = mapped_column(String(50), default="gemini-2.5-flash")
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    temperature: Mapped[float] = mapped_column(Float, default=0.7)
    max_tokens: Mapped[int] = mapped_column(Integer, default=1024)
    transfer_keywords: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    close_keywords: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    welcome_message: Mapped[str | None] = mapped_column(Text)
    business_hours: Mapped[dict | None] = mapped_column(JSONB)
    out_of_hours_message: Mapped[str | None] = mapped_column(Text)
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Relationships
    organization = relationship("Organization", back_populates="chatbot_configs")
