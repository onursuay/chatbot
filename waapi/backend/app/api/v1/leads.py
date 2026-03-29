"""Leads API — lead yonetimi (Kommo benzeri pipeline kartlari)."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.models.lead import Lead, LeadSource
from app.models.contact import Contact
from app.models.company import Company
from app.schemas.pipeline import LeadCreate, LeadUpdate, LeadResponse, LeadSourceCreate, LeadSourceResponse

router = APIRouter()


@router.get("", response_model=list[LeadResponse])
async def list_leads(
    pipeline_id: str | None = None,
    stage_id: str | None = None,
    status: str | None = None,
    assigned_to: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(Lead).where(Lead.org_id == org.id)

    if pipeline_id:
        query = query.where(Lead.pipeline_id == uuid.UUID(pipeline_id))
    if stage_id:
        query = query.where(Lead.stage_id == uuid.UUID(stage_id))
    if status:
        query = query.where(Lead.status == status)
    if assigned_to:
        query = query.where(Lead.assigned_to == uuid.UUID(assigned_to))
    if search:
        query = query.where(Lead.title.ilike(f"%{search}%"))

    query = query.order_by(Lead.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    leads = result.scalars().all()

    responses = []
    for l in leads:
        contact_name = None
        if l.contact_id:
            c = await db.get(Contact, l.contact_id)
            contact_name = c.name if c else None

        company_name = None
        if l.company_id:
            co = await db.get(Company, l.company_id)
            company_name = co.name if co else None

        assigned_name = None
        if l.assigned_to:
            u = await db.get(User, l.assigned_to)
            assigned_name = u.full_name if u else None

        responses.append(LeadResponse(
            id=str(l.id), pipeline_id=str(l.pipeline_id), stage_id=str(l.stage_id),
            title=l.title, contact_id=str(l.contact_id) if l.contact_id else None,
            company_id=str(l.company_id) if l.company_id else None,
            source_id=str(l.source_id) if l.source_id else None,
            assigned_to=str(l.assigned_to) if l.assigned_to else None,
            value=float(l.value or 0), currency=l.currency, status=l.status,
            loss_reason=l.loss_reason, tags=l.tags or [], score=l.score or 0,
            contact_name=contact_name, company_name=company_name,
            assigned_user_name=assigned_name,
            created_at=l.created_at, updated_at=l.updated_at,
        ))
    return responses


@router.post("", response_model=LeadResponse)
async def create_lead(
    req: LeadCreate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    lead = Lead(
        org_id=org.id,
        pipeline_id=uuid.UUID(req.pipeline_id),
        stage_id=uuid.UUID(req.stage_id),
        title=req.title,
        contact_id=uuid.UUID(req.contact_id) if req.contact_id else None,
        company_id=uuid.UUID(req.company_id) if req.company_id else None,
        source_id=uuid.UUID(req.source_id) if req.source_id else None,
        assigned_to=uuid.UUID(req.assigned_to) if req.assigned_to else None,
        value=req.value,
        currency=req.currency,
        tags=req.tags,
    )
    db.add(lead)
    await db.flush()

    return LeadResponse(
        id=str(lead.id), pipeline_id=str(lead.pipeline_id), stage_id=str(lead.stage_id),
        title=lead.title, contact_id=str(lead.contact_id) if lead.contact_id else None,
        company_id=str(lead.company_id) if lead.company_id else None,
        source_id=str(lead.source_id) if lead.source_id else None,
        assigned_to=str(lead.assigned_to) if lead.assigned_to else None,
        value=float(lead.value or 0), currency=lead.currency, status=lead.status,
        loss_reason=None, tags=lead.tags or [], score=0,
        created_at=lead.created_at, updated_at=lead.updated_at,
    )


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: str,
    req: LeadUpdate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == uuid.UUID(lead_id), Lead.org_id == org.id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead bulunamadi")

    data = req.model_dump(exclude_unset=True)
    for field, val in data.items():
        if field in ("stage_id", "contact_id", "company_id", "assigned_to") and val:
            val = uuid.UUID(val)
        setattr(lead, field, val)

    if req.status in ("won", "lost") and not lead.closed_at:
        lead.closed_at = datetime.now(timezone.utc)

    await db.flush()

    return LeadResponse(
        id=str(lead.id), pipeline_id=str(lead.pipeline_id), stage_id=str(lead.stage_id),
        title=lead.title, contact_id=str(lead.contact_id) if lead.contact_id else None,
        company_id=str(lead.company_id) if lead.company_id else None,
        source_id=str(lead.source_id) if lead.source_id else None,
        assigned_to=str(lead.assigned_to) if lead.assigned_to else None,
        value=float(lead.value or 0), currency=lead.currency, status=lead.status,
        loss_reason=lead.loss_reason, tags=lead.tags or [], score=lead.score or 0,
        created_at=lead.created_at, updated_at=lead.updated_at,
    )


@router.delete("/{lead_id}")
async def delete_lead(
    lead_id: str,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == uuid.UUID(lead_id), Lead.org_id == org.id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead bulunamadi")
    await db.delete(lead)
    return {"ok": True}


# --- Lead Sources ---

@router.get("/sources", response_model=list[LeadSourceResponse])
async def list_lead_sources(
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LeadSource).where(LeadSource.org_id == org.id, LeadSource.is_active == True)
    )
    return [
        LeadSourceResponse(id=str(s.id), name=s.name, icon=s.icon, color=s.color, is_active=s.is_active)
        for s in result.scalars().all()
    ]


@router.post("/sources", response_model=LeadSourceResponse)
async def create_lead_source(
    req: LeadSourceCreate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    source = LeadSource(org_id=org.id, name=req.name, icon=req.icon, color=req.color)
    db.add(source)
    await db.flush()
    return LeadSourceResponse(id=str(source.id), name=source.name, icon=source.icon, color=source.color, is_active=True)
