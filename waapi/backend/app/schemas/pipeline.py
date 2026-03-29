"""Pipeline ve Lead schemalari."""

from datetime import datetime
from pydantic import BaseModel


# --- Pipeline ---

class PipelineStageCreate(BaseModel):
    name: str
    color: str = "#3B82F6"
    sort_order: int = 0
    is_win: bool = False
    is_loss: bool = False


class PipelineStageResponse(BaseModel):
    id: str
    name: str
    color: str
    sort_order: int
    is_win: bool
    is_loss: bool

    model_config = {"from_attributes": True}


class PipelineCreate(BaseModel):
    name: str
    is_default: bool = False
    stages: list[PipelineStageCreate] = []


class PipelineUpdate(BaseModel):
    name: str | None = None
    is_default: bool | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class PipelineResponse(BaseModel):
    id: str
    name: str
    is_default: bool
    sort_order: int
    is_active: bool
    stages: list[PipelineStageResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Lead ---

class LeadCreate(BaseModel):
    pipeline_id: str
    stage_id: str
    title: str
    contact_id: str | None = None
    company_id: str | None = None
    source_id: str | None = None
    assigned_to: str | None = None
    value: float = 0
    currency: str = "TRY"
    tags: list[str] = []


class LeadUpdate(BaseModel):
    stage_id: str | None = None
    title: str | None = None
    contact_id: str | None = None
    company_id: str | None = None
    assigned_to: str | None = None
    value: float | None = None
    status: str | None = None
    loss_reason: str | None = None
    tags: list[str] | None = None
    score: int | None = None


class LeadResponse(BaseModel):
    id: str
    pipeline_id: str
    stage_id: str
    title: str
    contact_id: str | None
    company_id: str | None
    source_id: str | None
    assigned_to: str | None
    value: float
    currency: str
    status: str
    loss_reason: str | None
    tags: list[str]
    score: int
    contact_name: str | None = None
    company_name: str | None = None
    assigned_user_name: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Lead Source ---

class LeadSourceCreate(BaseModel):
    name: str
    icon: str | None = None
    color: str | None = None


class LeadSourceResponse(BaseModel):
    id: str
    name: str
    icon: str | None
    color: str | None
    is_active: bool

    model_config = {"from_attributes": True}
