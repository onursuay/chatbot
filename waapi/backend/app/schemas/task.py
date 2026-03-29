"""Task schemalari."""

from datetime import datetime
from pydantic import BaseModel


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    type: str = "task"           # task/call/meeting/email/follow_up
    priority: str = "normal"     # low/normal/high/urgent
    assigned_to: str | None = None
    lead_id: str | None = None
    contact_id: str | None = None
    conversation_id: str | None = None
    due_at: datetime | None = None
    reminder_at: datetime | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    type: str | None = None
    priority: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    due_at: datetime | None = None
    reminder_at: datetime | None = None
    result_text: str | None = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: str | None
    type: str
    priority: str
    status: str
    assigned_to: str | None
    assigned_user_name: str | None = None
    created_by: str
    creator_name: str | None = None
    lead_id: str | None
    contact_id: str | None
    conversation_id: str | None
    due_at: datetime | None
    completed_at: datetime | None
    reminder_at: datetime | None
    is_automated: bool
    result_text: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
