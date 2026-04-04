"""Chatbot Config API — AI bilgi tabanı ve ayarları yönetimi."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.models.chatbot import ChatbotConfig
from app.services.ai_service import (
    DEFAULT_CHATBOT_MAX_TOKENS,
    DEFAULT_CHATBOT_SYSTEM_PROMPT,
    LEGACY_CHATBOT_NAMES,
    LEGACY_CHATBOT_SYSTEM_PROMPTS,
    build_default_chatbot_settings,
)

router = APIRouter()


# ---- Schemas ----

class ChatbotConfigResponse(BaseModel):
    id: str
    name: str
    is_active: bool
    ai_provider: str
    ai_model: str
    system_prompt: str
    knowledge_base: str | None = None
    temperature: float
    max_tokens: int
    transfer_keywords: list[str]
    close_keywords: list[str]
    welcome_message: str | None
    business_hours: dict | None
    out_of_hours_message: str | None

    model_config = {"from_attributes": True}


class ChatbotConfigUpdateRequest(BaseModel):
    name: str | None = None
    is_active: bool | None = None
    ai_model: str | None = None
    system_prompt: str | None = None
    knowledge_base: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None
    transfer_keywords: list[str] | None = None
    close_keywords: list[str] | None = None
    welcome_message: str | None = None
    business_hours: dict | None = None
    out_of_hours_message: str | None = None


# ---- Endpoints ----

@router.get("", response_model=ChatbotConfigResponse)
async def get_chatbot_config(
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Organizasyonun chatbot ayarlarini getir."""
    result = await db.execute(
        select(ChatbotConfig).where(ChatbotConfig.org_id == org.id)
    )
    config = result.scalar_one_or_none()

    if not config:
        # Yoksa default olustur
        config = ChatbotConfig(
            org_id=org.id,
            name="Ceylin",
            is_active=True,
            system_prompt=DEFAULT_CHATBOT_SYSTEM_PROMPT,
            max_tokens=DEFAULT_CHATBOT_MAX_TOKENS,
            settings=build_default_chatbot_settings(),
        )
        db.add(config)
        await db.flush()

    normalized_settings = build_default_chatbot_settings(config.settings)
    should_backfill_settings = normalized_settings != (config.settings or {})
    normalized_system_prompt = (config.system_prompt or "").strip()
    should_backfill_system_prompt = (
        not normalized_system_prompt
        or normalized_system_prompt in LEGACY_CHATBOT_SYSTEM_PROMPTS
    )
    should_backfill_name = (config.name or "").strip() in LEGACY_CHATBOT_NAMES
    normalized_max_tokens = max(int(config.max_tokens or 0), DEFAULT_CHATBOT_MAX_TOKENS)
    should_backfill_max_tokens = normalized_max_tokens != config.max_tokens
    if should_backfill_settings or should_backfill_system_prompt or should_backfill_name or should_backfill_max_tokens:
        config.settings = normalized_settings
        if should_backfill_system_prompt:
            config.system_prompt = DEFAULT_CHATBOT_SYSTEM_PROMPT
        if should_backfill_name:
            config.name = "Ceylin"
        if should_backfill_max_tokens:
            config.max_tokens = normalized_max_tokens
        await db.flush()

    kb = normalized_settings.get("knowledge_base", "")

    return ChatbotConfigResponse(
        id=str(config.id),
        name=config.name,
        is_active=config.is_active,
        ai_provider=config.ai_provider,
        ai_model=config.ai_model,
        system_prompt=config.system_prompt,
        knowledge_base=kb,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        transfer_keywords=config.transfer_keywords or [],
        close_keywords=config.close_keywords or [],
        welcome_message=config.welcome_message,
        business_hours=config.business_hours,
        out_of_hours_message=config.out_of_hours_message,
    )


@router.patch("", response_model=ChatbotConfigResponse)
async def update_chatbot_config(
    req: ChatbotConfigUpdateRequest,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    """Chatbot ayarlarini guncelle."""
    result = await db.execute(
        select(ChatbotConfig).where(ChatbotConfig.org_id == org.id)
    )
    config = result.scalar_one_or_none()

    if not config:
        config = ChatbotConfig(
            org_id=org.id,
            name="Ceylin",
            is_active=True,
            system_prompt=DEFAULT_CHATBOT_SYSTEM_PROMPT,
            max_tokens=DEFAULT_CHATBOT_MAX_TOKENS,
            settings=build_default_chatbot_settings(),
        )
        db.add(config)
        await db.flush()

    if req.name is not None:
        config.name = req.name
    if req.is_active is not None:
        config.is_active = req.is_active
    if req.ai_model is not None:
        config.ai_model = req.ai_model
    if req.system_prompt is not None:
        config.system_prompt = req.system_prompt
    if req.knowledge_base is not None:
        settings = build_default_chatbot_settings(config.settings)
        settings["knowledge_base"] = req.knowledge_base
        config.settings = settings
    if req.temperature is not None:
        config.temperature = req.temperature
    if req.max_tokens is not None:
        config.max_tokens = max(req.max_tokens, DEFAULT_CHATBOT_MAX_TOKENS)
    if req.transfer_keywords is not None:
        config.transfer_keywords = req.transfer_keywords
    if req.close_keywords is not None:
        config.close_keywords = req.close_keywords
    if req.welcome_message is not None:
        config.welcome_message = req.welcome_message
    if req.business_hours is not None:
        config.business_hours = req.business_hours
    if req.out_of_hours_message is not None:
        config.out_of_hours_message = req.out_of_hours_message

    await db.flush()

    normalized_settings = build_default_chatbot_settings(config.settings)
    should_backfill_settings = normalized_settings != (config.settings or {})
    normalized_system_prompt = (config.system_prompt or "").strip()
    should_backfill_system_prompt = (
        not normalized_system_prompt
        or normalized_system_prompt in LEGACY_CHATBOT_SYSTEM_PROMPTS
    )
    should_backfill_name = (config.name or "").strip() in LEGACY_CHATBOT_NAMES
    normalized_max_tokens = max(int(config.max_tokens or 0), DEFAULT_CHATBOT_MAX_TOKENS)
    should_backfill_max_tokens = normalized_max_tokens != config.max_tokens
    if should_backfill_settings or should_backfill_system_prompt or should_backfill_name or should_backfill_max_tokens:
        config.settings = normalized_settings
        if should_backfill_system_prompt:
            config.system_prompt = DEFAULT_CHATBOT_SYSTEM_PROMPT
        if should_backfill_name:
            config.name = "Ceylin"
        if should_backfill_max_tokens:
            config.max_tokens = normalized_max_tokens
        await db.flush()

    kb = normalized_settings.get("knowledge_base", "")

    return ChatbotConfigResponse(
        id=str(config.id),
        name=config.name,
        is_active=config.is_active,
        ai_provider=config.ai_provider,
        ai_model=config.ai_model,
        system_prompt=config.system_prompt,
        knowledge_base=kb,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        transfer_keywords=config.transfer_keywords or [],
        close_keywords=config.close_keywords or [],
        welcome_message=config.welcome_message,
        business_hours=config.business_hours,
        out_of_hours_message=config.out_of_hours_message,
    )
