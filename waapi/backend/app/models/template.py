"""Template modeli — WhatsApp mesaj sablonlari."""

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Template(Base, TimestampMixin):
    __tablename__ = "templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    waba_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("waba_accounts.id"), nullable=False
    )
    meta_template_id: Mapped[str | None] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="tr")
    category: Mapped[str | None] = mapped_column(String(50))  # MARKETING, UTILITY, AUTHENTICATION
    status: Mapped[str] = mapped_column(String(20), default="DRAFT")  # DRAFT, PENDING, APPROVED, REJECTED
    components: Mapped[dict] = mapped_column(JSONB, nullable=False)
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    # Relationships
    organization = relationship("Organization", back_populates="templates")
    waba_account = relationship("WABAAccount", back_populates="templates")
