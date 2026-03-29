"""WABA (WhatsApp Business Account) ve Phone Number modelleri."""

import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class WABAAccount(Base, TimestampMixin):
    __tablename__ = "waba_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    waba_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255))
    access_token: Mapped[str] = mapped_column(Text, nullable=False)  # Fernet ile sifrelenmis
    business_id: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    organization = relationship("Organization", back_populates="waba_accounts")
    phone_numbers = relationship("PhoneNumber", back_populates="waba_account", cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="waba_account", cascade="all, delete-orphan")


class PhoneNumber(Base, TimestampMixin):
    __tablename__ = "phone_numbers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    waba_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("waba_accounts.id", ondelete="CASCADE"), nullable=False
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    phone_number_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    display_number: Mapped[str] = mapped_column(String(20), nullable=False)
    verified_name: Mapped[str | None] = mapped_column(String(255))
    quality_rating: Mapped[str] = mapped_column(String(20), default="GREEN")
    status: Mapped[str] = mapped_column(String(20), default="CONNECTED")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    waba_account = relationship("WABAAccount", back_populates="phone_numbers")
    organization = relationship("Organization", back_populates="phone_numbers")
    conversations = relationship("Conversation", back_populates="phone_number")
