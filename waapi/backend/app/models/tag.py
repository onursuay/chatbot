"""Tag modeli — etiket yonetimi (Kommo benzeri)."""

import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Tag(Base, TimestampMixin):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(7), default="#6B7280")
    entity_type: Mapped[str] = mapped_column(String(20), default="contact")  # contact/lead/company/conversation
    usage_count: Mapped[int] = mapped_column(Integer, default=0)

    # Relationships
    organization = relationship("Organization", back_populates="tags")

    __table_args__ = (
        # unique(org_id, name, entity_type) — schema.sql'de tanimli
    )
