"""CRM schemalari — tag, custom field, activity log, webhook, web form, team, call, email, saved filter."""

from datetime import datetime
from pydantic import BaseModel


# --- Tag ---

class TagCreate(BaseModel):
    name: str
    color: str = "#6B7280"
    entity_type: str = "contact"


class TagUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class TagResponse(BaseModel):
    id: str
    name: str
    color: str
    entity_type: str
    usage_count: int
    model_config = {"from_attributes": True}


# --- Custom Field ---

class CustomFieldCreate(BaseModel):
    entity_type: str
    field_name: str
    field_label: str
    field_type: str
    options: list = []
    is_required: bool = False
    sort_order: int = 0
    default_value: str | None = None
    placeholder: str | None = None


class CustomFieldResponse(BaseModel):
    id: str
    entity_type: str
    field_name: str
    field_label: str
    field_type: str
    options: list
    is_required: bool
    is_visible: bool
    sort_order: int
    default_value: str | None
    placeholder: str | None
    model_config = {"from_attributes": True}


class CustomFieldValueSet(BaseModel):
    field_id: str
    value: str | None = None


# --- Activity Log ---

class ActivityLogResponse(BaseModel):
    id: str
    user_id: str | None
    user_name: str | None = None
    entity_type: str
    entity_id: str
    action: str
    old_value: dict | None
    new_value: dict | None
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Webhook Config ---

class WebhookConfigCreate(BaseModel):
    name: str | None = None
    url: str
    secret: str | None = None
    events: list[str] = []


class WebhookConfigUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    events: list[str] | None = None
    is_active: bool | None = None


class WebhookConfigResponse(BaseModel):
    id: str
    name: str | None
    url: str
    events: list[str]
    is_active: bool
    retry_count: int
    last_triggered_at: datetime | None
    last_status_code: int | None
    failure_count: int
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Web Form ---

class WebFormCreate(BaseModel):
    name: str
    slug: str
    pipeline_id: str | None = None
    stage_id: str | None = None
    assigned_to: str | None = None
    fields: list = []
    settings: dict = {}
    style: dict = {}


class WebFormUpdate(BaseModel):
    name: str | None = None
    fields: list | None = None
    settings: dict | None = None
    style: dict | None = None
    is_active: bool | None = None


class WebFormResponse(BaseModel):
    id: str
    name: str
    slug: str
    pipeline_id: str | None
    stage_id: str | None
    assigned_to: str | None
    fields: list
    settings: dict
    style: dict
    is_active: bool
    submission_count: int
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Team Invitation ---

class TeamInvitationCreate(BaseModel):
    email: str
    role: str = "agent"


class TeamInvitationResponse(BaseModel):
    id: str
    email: str
    role: str
    status: str
    expires_at: datetime
    accepted_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Call Log ---

class CallLogCreate(BaseModel):
    contact_id: str | None = None
    lead_id: str | None = None
    direction: str = "outbound"
    phone_from: str | None = None
    phone_to: str | None = None
    duration_seconds: int = 0
    notes: str | None = None


class CallLogResponse(BaseModel):
    id: str
    user_id: str | None
    contact_id: str | None
    lead_id: str | None
    direction: str
    status: str
    phone_from: str | None
    phone_to: str | None
    duration_seconds: int
    recording_url: str | None
    notes: str | None
    started_at: datetime
    ended_at: datetime | None
    model_config = {"from_attributes": True}


# --- Email Log ---

class EmailLogCreate(BaseModel):
    contact_id: str | None = None
    lead_id: str | None = None
    to_email: str
    subject: str | None = None
    body_html: str | None = None
    body_text: str | None = None


class EmailLogResponse(BaseModel):
    id: str
    user_id: str | None
    contact_id: str | None
    lead_id: str | None
    direction: str
    from_email: str
    to_email: str
    subject: str | None
    status: str
    opened_at: datetime | None
    clicked_at: datetime | None
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Salesbot Flow ---

class SalesbotFlowCreate(BaseModel):
    name: str
    description: str | None = None
    trigger_type: str
    trigger_config: dict = {}


class SalesbotFlowUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    trigger_type: str | None = None
    trigger_config: dict | None = None
    is_active: bool | None = None


class SalesbotFlowStepCreate(BaseModel):
    step_type: str
    config: dict = {}
    position_x: int = 0
    position_y: int = 0
    next_step_id: str | None = None
    true_step_id: str | None = None
    false_step_id: str | None = None
    sort_order: int = 0


class SalesbotFlowStepResponse(BaseModel):
    id: str
    step_type: str
    config: dict
    position_x: int
    position_y: int
    next_step_id: str | None
    true_step_id: str | None
    false_step_id: str | None
    sort_order: int
    model_config = {"from_attributes": True}


class SalesbotFlowResponse(BaseModel):
    id: str
    name: str
    description: str | None
    trigger_type: str
    trigger_config: dict
    is_active: bool
    version: int
    published_at: datetime | None
    stats: dict
    steps: list[SalesbotFlowStepResponse] = []
    created_at: datetime
    model_config = {"from_attributes": True}


# --- Dashboard Widget ---

class DashboardWidgetCreate(BaseModel):
    widget_type: str
    title: str
    config: dict = {}
    position_x: int = 0
    position_y: int = 0
    width: int = 4
    height: int = 2


class DashboardWidgetUpdate(BaseModel):
    title: str | None = None
    config: dict | None = None
    position_x: int | None = None
    position_y: int | None = None
    width: int | None = None
    height: int | None = None
    is_visible: bool | None = None


class DashboardWidgetResponse(BaseModel):
    id: str
    widget_type: str
    title: str
    config: dict
    position_x: int
    position_y: int
    width: int
    height: int
    is_visible: bool
    model_config = {"from_attributes": True}


# --- Lead Scoring Rule ---

class LeadScoringRuleCreate(BaseModel):
    name: str
    condition_type: str
    condition_config: dict = {}
    score_delta: int = 0


class LeadScoringRuleResponse(BaseModel):
    id: str
    name: str
    condition_type: str
    condition_config: dict
    score_delta: int
    is_active: bool
    model_config = {"from_attributes": True}


# --- Saved Filter ---

class SavedFilterCreate(BaseModel):
    name: str
    entity_type: str
    filters: dict = {}
    is_shared: bool = False


class SavedFilterResponse(BaseModel):
    id: str
    name: str
    entity_type: str
    filters: dict
    is_default: bool
    is_shared: bool
    created_at: datetime
    model_config = {"from_attributes": True}
