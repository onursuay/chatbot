"""Contacts API — kisi yonetimi."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.models.contact import Contact
from app.schemas.message import ContactResponse, ContactCreateRequest
from app.utils.phone import normalize_wa_id

router = APIRouter()


@router.get("", response_model=list[ContactResponse])
async def list_contacts(
    search: str | None = None,
    tag: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Contact)
        .where(Contact.org_id == org.id)
        .order_by(Contact.last_message_at.desc().nullslast())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    if search:
        query = query.where(
            Contact.name.ilike(f"%{search}%") | Contact.phone.ilike(f"%{search}%")
        )
    if tag:
        query = query.where(Contact.tags.any(tag))

    result = await db.execute(query)
    contacts = result.scalars().all()

    return [
        ContactResponse(
            id=str(c.id),
            wa_id=c.wa_id,
            phone=c.phone,
            name=c.name,
            profile_name=c.profile_name,
            email=c.email,
            tags=c.tags or [],
            last_message_at=c.last_message_at,
            created_at=c.created_at,
        )
        for c in contacts
    ]


@router.post("", response_model=ContactResponse)
async def create_contact(
    req: ContactCreateRequest,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    wa_id = normalize_wa_id(req.phone)
    contact = Contact(
        org_id=org.id,
        wa_id=wa_id,
        phone=req.phone,
        name=req.name,
        email=req.email,
        tags=req.tags,
    )
    db.add(contact)
    await db.flush()

    return ContactResponse(
        id=str(contact.id),
        wa_id=contact.wa_id,
        phone=contact.phone,
        name=contact.name,
        profile_name=None,
        email=contact.email,
        tags=contact.tags or [],
        last_message_at=None,
        created_at=contact.created_at,
    )


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: str,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Contact).where(Contact.id == uuid.UUID(contact_id), Contact.org_id == org.id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Kisi bulunamadi")

    return ContactResponse(
        id=str(contact.id),
        wa_id=contact.wa_id,
        phone=contact.phone,
        name=contact.name,
        profile_name=contact.profile_name,
        email=contact.email,
        tags=contact.tags or [],
        last_message_at=contact.last_message_at,
        created_at=contact.created_at,
    )
