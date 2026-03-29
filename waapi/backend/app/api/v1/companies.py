"""Companies API — sirket yonetimi."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.models.company import Company
from app.models.contact import Contact
from app.models.lead import Lead
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse

router = APIRouter()


@router.get("", response_model=list[CompanyResponse])
async def list_companies(
    search: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(Company).where(Company.org_id == org.id).order_by(Company.created_at.desc())
    if search:
        query = query.where(Company.name.ilike(f"%{search}%") | Company.domain.ilike(f"%{search}%"))
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    companies = result.scalars().all()

    responses = []
    for c in companies:
        contact_count = (await db.execute(
            select(func.count()).select_from(Contact).where(Contact.company_id == c.id)
        )).scalar() or 0

        lead_count = (await db.execute(
            select(func.count()).select_from(Lead).where(Lead.company_id == c.id)
        )).scalar() or 0

        responses.append(CompanyResponse(
            id=str(c.id), name=c.name, domain=c.domain, industry=c.industry,
            size=c.size, phone=c.phone, email=c.email, address=c.address,
            city=c.city, country=c.country, website=c.website, tax_id=c.tax_id,
            tags=c.tags or [], is_active=c.is_active,
            contact_count=contact_count, lead_count=lead_count,
            created_at=c.created_at,
        ))
    return responses


@router.post("", response_model=CompanyResponse)
async def create_company(
    req: CompanyCreate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    company = Company(
        org_id=org.id, name=req.name, domain=req.domain, industry=req.industry,
        size=req.size, phone=req.phone, email=req.email, address=req.address,
        city=req.city, country=req.country, website=req.website, tax_id=req.tax_id,
        tags=req.tags,
    )
    db.add(company)
    await db.flush()

    return CompanyResponse(
        id=str(company.id), name=company.name, domain=company.domain,
        industry=company.industry, size=company.size, phone=company.phone,
        email=company.email, address=company.address, city=company.city,
        country=company.country, website=company.website, tax_id=company.tax_id,
        tags=company.tags or [], is_active=True, created_at=company.created_at,
    )


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: str,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(Company.id == uuid.UUID(company_id), Company.org_id == org.id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Sirket bulunamadi")

    contact_count = (await db.execute(
        select(func.count()).select_from(Contact).where(Contact.company_id == company.id)
    )).scalar() or 0

    lead_count = (await db.execute(
        select(func.count()).select_from(Lead).where(Lead.company_id == company.id)
    )).scalar() or 0

    return CompanyResponse(
        id=str(company.id), name=company.name, domain=company.domain,
        industry=company.industry, size=company.size, phone=company.phone,
        email=company.email, address=company.address, city=company.city,
        country=company.country, website=company.website, tax_id=company.tax_id,
        tags=company.tags or [], is_active=company.is_active,
        contact_count=contact_count, lead_count=lead_count,
        created_at=company.created_at,
    )


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: str,
    req: CompanyUpdate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(Company.id == uuid.UUID(company_id), Company.org_id == org.id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Sirket bulunamadi")

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(company, field, val)
    await db.flush()

    return CompanyResponse(
        id=str(company.id), name=company.name, domain=company.domain,
        industry=company.industry, size=company.size, phone=company.phone,
        email=company.email, address=company.address, city=company.city,
        country=company.country, website=company.website, tax_id=company.tax_id,
        tags=company.tags or [], is_active=company.is_active,
        created_at=company.created_at,
    )


@router.delete("/{company_id}")
async def delete_company(
    company_id: str,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company).where(Company.id == uuid.UUID(company_id), Company.org_id == org.id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Sirket bulunamadi")
    await db.delete(company)
    return {"ok": True}
