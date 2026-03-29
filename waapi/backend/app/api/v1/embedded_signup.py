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


class ConnectedPhoneInfo(BaseModel):
    phone_number: str
    phone_number_id: str
    verified_name: str | None = None


class ConnectedWabaInfo(BaseModel):
    waba_id: str
    waba_name: str
    business_id: str | None = None
    phone_numbers: list[ConnectedPhoneInfo] = []


class EmbeddedSignupResponse(BaseModel):
    accounts: list[ConnectedWabaInfo] = []
    message: str = "WhatsApp hesapları başarıyla bağlandı"


@router.post("/connect", response_model=EmbeddedSignupResponse)
async def connect_whatsapp(
    body: EmbeddedSignupRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Facebook Login'den gelen authorization code ile TÜM WhatsApp hesaplarını
    portfolyo olarak bağla. Birden fazla WABA ve telefon numarası destekler.
    """
    # 1. Code -> Access Token
    token_data = await _exchange_code_for_token(body.code)
    user_access_token = token_data["access_token"]

    # 2. Debug token ile TÜM WABA bilgilerini al
    shared_waba_ids = await _get_shared_wabas(user_access_token)
    if not shared_waba_ids:
        raise HTTPException(
            status_code=400,
            detail="WhatsApp Business hesabı bulunamadı. Lütfen Embedded Signup'ı tamamlayın.",
        )

    encrypted_access_token = encrypt_token(user_access_token)
    connected_accounts: list[ConnectedWabaInfo] = []
    last_business_id: str | None = None

    # 3. TÜM WABA'ları döngüyle kaydet
    for waba_id in shared_waba_ids:
        waba_details = await _get_waba_details(user_access_token, waba_id)
        business_id = waba_details.get("on_behalf_of_business_info", {}).get("id")
        if business_id:
            last_business_id = business_id

        # Telefon numaralarını al
        phone_numbers = await _get_phone_numbers(user_access_token, waba_id)

        # WABA'yı uygulamaya subscribe et
        await _subscribe_waba(user_access_token, waba_id)

        # Mevcut WABA var mı kontrol et
        existing = await db.execute(
            select(WABAAccount).where(WABAAccount.waba_id == waba_id)
        )
        waba_account = existing.scalar_one_or_none()

        if waba_account:
            waba_account.access_token = encrypted_access_token
            waba_account.is_active = True
            waba_account.business_id = business_id
        else:
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

        # TÜM telefon numaralarını kaydet
        connected_phones: list[ConnectedPhoneInfo] = []
        for phone in phone_numbers:
            existing_phone = await db.execute(
                select(PhoneNumber).where(PhoneNumber.phone_number_id == phone["id"])
            )
            phone_record = existing_phone.scalar_one_or_none()

            if not phone_record:
                # Yeni numarayı register et
                await _register_phone_number(user_access_token, phone["id"])

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

            connected_phones.append(ConnectedPhoneInfo(
                phone_number=phone["display_phone_number"],
                phone_number_id=phone["id"],
                verified_name=phone.get("verified_name"),
            ))

        connected_accounts.append(ConnectedWabaInfo(
            waba_id=waba_id,
            waba_name=waba_details.get("name", "WhatsApp Business"),
            business_id=business_id,
            phone_numbers=connected_phones,
        ))

    # Organization'ı güncelle
    if last_business_id:
        org = await db.get(Organization, current_user.org_id)
        if org:
            org.meta_business_id = last_business_id

    await db.commit()

    logger.info(
        f"WhatsApp portfolyo bağlandı: org={current_user.org_id}, "
        f"{len(connected_accounts)} WABA, "
        f"{sum(len(a.phone_numbers) for a in connected_accounts)} telefon"
    )

    return EmbeddedSignupResponse(
        accounts=connected_accounts,
        message=f"{len(connected_accounts)} WhatsApp hesabı başarıyla bağlandı",
    )


@router.get("/status")
async def get_connection_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mevcut WhatsApp bağlantı durumunu döndür — TÜM WABA portfolyosu."""
    result = await db.execute(
        select(WABAAccount)
        .where(WABAAccount.org_id == current_user.org_id)
    )
    wabas = result.scalars().all()

    if not wabas:
        return {"connected": False, "accounts": []}

    accounts = []
    for waba in wabas:
        phones_result = await db.execute(
            select(PhoneNumber).where(PhoneNumber.waba_id == waba.id)
        )
        phones = phones_result.scalars().all()

        accounts.append({
            "id": str(waba.id),
            "waba_id": waba.waba_id,
            "waba_name": waba.name,
            "business_id": waba.business_id,
            "is_active": waba.is_active,
            "phone_numbers": [
                {
                    "id": p.phone_number_id,
                    "number": p.display_number,
                    "verified_name": p.verified_name,
                    "quality_rating": p.quality_rating,
                    "status": p.status,
                    "is_active": p.is_active,
                }
                for p in phones
            ],
        })

    active_count = sum(1 for a in accounts if a["is_active"])

    return {
        "connected": active_count > 0,
        "accounts": accounts,
        # Legacy compat — ilk aktif WABA
        "waba_id": next((a["waba_id"] for a in accounts if a["is_active"]), None),
        "waba_name": next((a["waba_name"] for a in accounts if a["is_active"]), None),
        "business_id": next((a["business_id"] for a in accounts if a["is_active"]), None),
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
