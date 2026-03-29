"""Auth service — kayit, giris, token islemleri."""

import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.user import User
from app.models.chatbot import ChatbotConfig
from app.utils.security import hash_password, verify_password, create_access_token, create_refresh_token


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text[:100]


async def register(
    db: AsyncSession,
    email: str,
    password: str,
    full_name: str,
    org_name: str,
) -> tuple[User, Organization, dict]:
    """Yeni organizasyon + kullanici olustur."""

    # Email kontrolu
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise ValueError("Bu email adresi zaten kayitli")

    # Slug olustur
    base_slug = slugify(org_name)
    slug = base_slug
    counter = 1
    while True:
        existing_org = await db.execute(select(Organization).where(Organization.slug == slug))
        if not existing_org.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Organization
    org = Organization(name=org_name, slug=slug, plan="trial")
    db.add(org)
    await db.flush()

    # User (owner)
    user = User(
        org_id=org.id,
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        role="owner",
    )
    db.add(user)

    # Default chatbot config
    default_bot = ChatbotConfig(
        org_id=org.id,
        name="Default Bot",
        system_prompt="Sen bir WhatsApp asistanisin. Musterilere yardimci ol, kibar ve profesyonel ol. Kisa ve oz yanitlar ver.",
        is_active=True,
    )
    db.add(default_bot)
    await db.flush()

    tokens = _create_tokens(user, org)
    return user, org, tokens


async def login(db: AsyncSession, email: str, password: str) -> tuple[User, Organization, dict]:
    """Kullanici girisi."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(password, user.password_hash):
        raise ValueError("Gecersiz email veya sifre")

    if not user.is_active:
        raise ValueError("Hesap devre disi")

    result = await db.execute(select(Organization).where(Organization.id == user.org_id))
    org = result.scalar_one()

    tokens = _create_tokens(user, org)
    return user, org, tokens


def _create_tokens(user: User, org: Organization) -> dict:
    payload = {
        "sub": str(user.id),
        "org_id": str(org.id),
        "role": user.role,
        "email": user.email,
    }
    return {
        "access_token": create_access_token(payload),
        "refresh_token": create_refresh_token(payload),
        "token_type": "bearer",
    }
