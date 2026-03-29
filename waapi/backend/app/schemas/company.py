"""Company schemalari."""

from datetime import datetime
from pydantic import BaseModel


class CompanyCreate(BaseModel):
    name: str
    domain: str | None = None
    industry: str | None = None
    size: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    website: str | None = None
    tax_id: str | None = None
    tags: list[str] = []


class CompanyUpdate(BaseModel):
    name: str | None = None
    domain: str | None = None
    industry: str | None = None
    size: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    website: str | None = None
    tax_id: str | None = None
    tags: list[str] | None = None
    is_active: bool | None = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    domain: str | None
    industry: str | None
    size: str | None
    phone: str | None
    email: str | None
    address: str | None
    city: str | None
    country: str | None
    website: str | None
    tax_id: str | None
    tags: list[str]
    is_active: bool
    contact_count: int = 0
    lead_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}
