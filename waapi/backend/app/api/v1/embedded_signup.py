"""Embedded Signup — Müşterilerin WhatsApp hesabını platforma bağlaması.

Akış:
1. Frontend'de Facebook Login SDK ile kullanıcı giriş yapar
2. Facebook, bir authorization code döner
3. Bu endpoint code'u alır, access_token'a çevirir
4. WABA ID ve Phone Number bilgilerini Meta API'den çeker
5. Veritabanına kaydeder
"""

import logging
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.api.v1.auth import get_current_user
from app.models.organization import Organization
from app.models.user import User
from app.models.waba import WABAAccount, PhoneNumber
from app.utils.security import encrypt_token

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


class EmbeddedSignupRequest(BaseModel):
    code: str


class EmbeddedSignupResponse(BaseModel):
    waba_id: str
    phone_number: str
    phone_number_id: str
    verified_name: str | None = None
    message: str = "WhatsApp hesabı başarıyla bağlandı"


@router.post("/connect", response_model=EmbeddedSignupResponse)
async def connect_whatsapp(
    body: EmbeddedSignupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Facebook Login'den gelen authorization code ile WhatsApp hesabını bağla.
    """
    # 1. Code -> Access Token
    token_data = await _exchange_code_for_token(body.code)
    user_access_token = token_data["access_token"]

    # 2. Debug token ile WABA bilgilerini al
    shared_waba_ids = await _get_shared_wabas(user_access_token)
    if not shared_waba_ids:
        raise HTTPException(
            status_code=400,
            detail="WhatsApp Business hesabı bulunamadı. Lütfen Embedded Signup'ı tamamlayın.",
        )

    waba_id = shared_waba_ids[0]

    # 3. WABA için System User Token oluştur (subscribe)
    # Önce business ID'yi alalım
    waba_details = await _get_waba_details(user_access_token, waba_id)
    business_id = waba_details.get("on_behalf_of_business_info", {}).get("id")

    # 4. Telefon numaralarını al
    phone_numbers = await _get_phone_numbers(user_access_token, waba_id)
    if not phone_numbers:
        raise HTTPException(
            status_code=400,
            detail="Henüz bir telefon numarası eklenmemiş.",
        )

    phone = phone_numbers[0]

    # 5. WABA'yı uygulamaya subscribe et
    await _subscribe_waba(user_access_token, waba_id)

    # 6. Webhook'a subscribe ol
    await _register_phone_number(user_access_token, phone["id"])

    # 7. Veritabanına kaydet
    # Mevcut WABA var mı kontrol et
    existing = await db.execute(
        select(WABAAccount).where(WABAAccount.waba_id == waba_id)
    )
    waba_account = existing.scalar_one_or_none()

    encrypted_access_token = encrypt_token(user_access_token)

    if waba_account:
        # Güncelle
        waba_account.access_token = encrypted_access_token
        waba_account.is_active = True
        waba_account.business_id = business_id
    else:
        # Yeni oluştur
        waba_account = WABAAccount(
            org_id=current_user.org_id,
            waba_id=waba_id,
            name=waba_details.get("name", "WhatsApp Business"),
            access_token=encrypted_access_token,
            business_id=business_id,
            is_active=True,
        )
        db.add(waba_account)
        await db.flush()

    # Telefon numarasını kaydet
    existing_phone = await db.execute(
        select(PhoneNumber).where(PhoneNumber.phone_number_id == phone["id"])
    )
    phone_record = existing_phone.scalar_one_or_none()

    if phone_record:
        phone_record.display_number = phone["display_phone_number"]
        phone_record.verified_name = phone.get("verified_name")
        phone_record.is_active = True
    else:
        phone_record = PhoneNumber(
            waba_id=waba_account.id,
            org_id=current_user.org_id,
            phone_number_id=phone["id"],
            display_number=phone["display_phone_number"],
            verified_name=phone.get("verified_name"),
            quality_rating=phone.get("quality_rating", "GREEN"),
            status="CONNECTED",
            is_active=True,
        )
        db.add(phone_record)

    # Organization'ı güncelle
    org = await db.get(Organization, current_user.org_id)
    if org:
        org.meta_business_id = business_id

    await db.commit()

    logger.info(
        f"WhatsApp bağlandı: org={current_user.org_id}, waba={waba_id}, phone={phone['display_phone_number']}"
    )

    return EmbeddedSignupResponse(
        waba_id=waba_id,
        phone_number=phone["display_phone_number"],
        phone_number_id=phone["id"],
        verified_name=phone.get("verified_name"),
    )


@router.get("/status")
async def get_connection_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mevcut WhatsApp bağlantı durumunu döndür."""
    result = await db.execute(
        select(WABAAccount)
        .where(WABAAccount.org_id == current_user.org_id, WABAAccount.is_active == True)
    )
    waba = result.scalar_one_or_none()

    if not waba:
        return {"connected": False}

    phones_result = await db.execute(
        select(PhoneNumber)
        .where(PhoneNumber.waba_id == waba.id, PhoneNumber.is_active == True)
    )
    phones = phones_result.scalars().all()

    return {
        "connected": True,
        "waba_id": waba.waba_id,
        "waba_name": waba.name,
        "business_id": waba.business_id,
        "phone_numbers": [
            {
                "id": p.phone_number_id,
                "number": p.display_number,
                "verified_name": p.verified_name,
                "quality_rating": p.quality_rating,
                "status": p.status,
            }
            for p in phones
        ],
    }


# --- Meta API helpers ---

async def _exchange_code_for_token(code: str) -> dict:
    """Authorization code'u access token'a çevir."""
    url = f"{settings.graph_api_base}/oauth/access_token"
    params = {
        "client_id": settings.META_APP_ID,
        "client_secret": settings.META_APP_SECRET,
        "code": code,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        data = resp.json()
        if "access_token" not in data:
            logger.error(f"Token exchange failed: {data}")
            raise HTTPException(status_code=400, detail="Facebook token alınamadı.")
        return data


async def _get_shared_wabas(access_token: str) -> list[str]:
    """Kullanıcının paylaştığı WABA ID'lerini al (debug_token aracılığıyla)."""
    # Önce debug_token ile shared WABA'ları al
    url = f"{settings.graph_api_base}/debug_token"
    params = {
        "input_token": access_token,
        "access_token": f"{settings.META_APP_ID}|{settings.META_APP_SECRET}",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params)
        data = resp.json()

    granular_scopes = data.get("data", {}).get("granular_scopes", [])
    for scope in granular_scopes:
        if scope.get("scope") == "whatsapp_business_management":
            return scope.get("target_ids", [])

    # Fallback: doğrudan WABA listesini çek
    url = f"{settings.graph_api_base}/me/businesses"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers)
        data = resp.json()

    waba_ids = []
    for biz in data.get("data", []):
        biz_id = biz["id"]
        waba_url = f"{settings.graph_api_base}/{biz_id}/owned_whatsapp_business_accounts"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(waba_url, headers=headers)
            waba_data = resp.json()
            for waba in waba_data.get("data", []):
                waba_ids.append(waba["id"])

    return waba_ids


async def _get_waba_details(access_token: str, waba_id: str) -> dict:
    """WABA detaylarını al."""
    url = f"{settings.graph_api_base}/{waba_id}"
    params = {"fields": "name,on_behalf_of_business_info,currency,timezone_id"}
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers, params=params)
        return resp.json()


async def _get_phone_numbers(access_token: str, waba_id: str) -> list[dict]:
    """WABA'ya bağlı telefon numaralarını al."""
    url = f"{settings.graph_api_base}/{waba_id}/phone_numbers"
    params = {"fields": "id,display_phone_number,verified_name,quality_rating,code_verification_status"}
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers=headers, params=params)
        data = resp.json()
        return data.get("data", [])


async def _subscribe_waba(access_token: str, waba_id: str) -> None:
    """WABA'yı uygulamaya subscribe et — webhook mesajları almak için gerekli."""
    url = f"{settings.graph_api_base}/{waba_id}/subscribed_apps"
    headers = {"Authorization": f"Bearer {access_token}"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, headers=headers)
        data = resp.json()
        if not data.get("success"):
            logger.warning(f"WABA subscribe başarısız: {data}")


async def _register_phone_number(access_token: str, phone_number_id: str) -> None:
    """Telefon numarasını mesaj almak için register et."""
    url = f"{settings.graph_api_base}/{phone_number_id}/register"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    payload = {"messaging_product": "whatsapp", "pin": "123456"}
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            data = resp.json()
            if not data.get("success"):
                logger.info(f"Phone register (muhtemelen zaten kayıtlı): {data}")
        except Exception as e:
            logger.warning(f"Phone register hatası: {e}")
