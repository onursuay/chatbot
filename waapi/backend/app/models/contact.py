"""Contact modeli."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Contact(Base, TimestampMixin):
    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="SET NULL")
    )
    wa_id: Mapped[str] = mapped_column(String(20), nullable=False)  # WhatsApp ID (telefon, + olmadan)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255))
    profile_name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    title: Mapped[str | None] = mapped_column(String(100))  # Unvan (CEO, CTO, vb.)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    attributes: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Relationships
    organization = relationship("Organization", back_populates="contacts")
    company = relationship("Company", back_populates="contacts")
    conversations = relationship("Conversation", back_populates="contact", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="contact")
    tasks = relationship("Task", back_populates="contact")
    call_logs = relationship("CallLog", back_populates="contact")
    email_logs = relationship("EmailLog", back_populates="contact")

    __table_args__ = (
        # Aynı org'da aynı wa_id olamaz
    )
