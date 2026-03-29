"""Organization (tenant) modeli."""

import uuid

from sqlalchemy import Boolean, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    plan: Mapped[str] = mapped_column(String(50), default="trial")
    meta_business_id: Mapped[str | None] = mapped_column(String(100))
    settings: Mapped[dict] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships — mevcut
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    waba_accounts = relationship("WABAAccount", back_populates="organization", cascade="all, delete-orphan")
    phone_numbers = relationship("PhoneNumber", back_populates="organization", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="organization", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="organization", cascade="all, delete-orphan")
    chatbot_configs = relationship("ChatbotConfig", back_populates="organization", cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="organization", cascade="all, delete-orphan")
    broadcasts = relationship("Broadcast", back_populates="organization", cascade="all, delete-orphan")
    automations = relationship("Automation", back_populates="organization", cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="organization", cascade="all, delete-orphan")

    # Relationships — yeni (Kommo)
    companies = relationship("Company", back_populates="organization", cascade="all, delete-orphan")
    pipelines = relationship("Pipeline", back_populates="organization", cascade="all, delete-orphan")
    leads = relationship("Lead", back_populates="organization", cascade="all, delete-orphan")
    lead_sources = relationship("LeadSource", back_populates="organization", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="organization", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="organization", cascade="all, delete-orphan")
    custom_field_definitions = relationship("CustomFieldDefinition", back_populates="organization", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="organization", cascade="all, delete-orphan")
    webhook_configs = relationship("WebhookConfig", back_populates="organization", cascade="all, delete-orphan")
    web_forms = relationship("WebForm", back_populates="organization", cascade="all, delete-orphan")
    salesbot_flows = relationship("SalesbotFlow", back_populates="organization", cascade="all, delete-orphan")
    team_invitations = relationship("TeamInvitation", back_populates="organization", cascade="all, delete-orphan")
    call_logs = relationship("CallLog", back_populates="organization", cascade="all, delete-orphan")
    email_logs = relationship("EmailLog", back_populates="organization", cascade="all, delete-orphan")
    lead_scoring_rules = relationship("LeadScoringRule", back_populates="organization", cascade="all, delete-orphan")
