"""Tasks API — gorev yonetimi."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter()


def _task_response(t: Task, assignee_name: str | None = None, creator_name: str | None = None) -> TaskResponse:
    return TaskResponse(
        id=str(t.id), title=t.title, description=t.description,
        type=t.type, priority=t.priority, status=t.status,
        assigned_to=str(t.assigned_to) if t.assigned_to else None,
        assigned_user_name=assignee_name,
        created_by=str(t.created_by), creator_name=creator_name,
        lead_id=str(t.lead_id) if t.lead_id else None,
        contact_id=str(t.contact_id) if t.contact_id else None,
        conversation_id=str(t.conversation_id) if t.conversation_id else None,
        due_at=t.due_at, completed_at=t.completed_at,
        reminder_at=t.reminder_at, is_automated=t.is_automated,
        result_text=t.result_text, created_at=t.created_at,
    )


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    status: str | None = None,
    assigned_to: str | None = None,
    lead_id: str | None = None,
    type: str | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(Task).where(Task.org_id == org.id)
    if status:
        query = query.where(Task.status == status)
    if assigned_to:
        query = query.where(Task.assigned_to == uuid.UUID(assigned_to))
    if lead_id:
        query = query.where(Task.lead_id == uuid.UUID(lead_id))
    if type:
        query = query.where(Task.type == type)

    query = query.order_by(Task.due_at.asc().nullslast()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    tasks = result.scalars().all()

    responses = []
    for t in tasks:
        assignee_name = None
        if t.assigned_to:
            u = await db.get(User, t.assigned_to)
            assignee_name = u.full_name if u else None
        creator = await db.get(User, t.created_by)
        creator_name = creator.full_name if creator else None
        responses.append(_task_response(t, assignee_name, creator_name))
    return responses


@router.post("", response_model=TaskResponse)
async def create_task(
    req: TaskCreate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    task = Task(
        org_id=org.id, created_by=user.id, title=req.title,
        description=req.description, type=req.type, priority=req.priority,
        assigned_to=uuid.UUID(req.assigned_to) if req.assigned_to else None,
        lead_id=uuid.UUID(req.lead_id) if req.lead_id else None,
        contact_id=uuid.UUID(req.contact_id) if req.contact_id else None,
        conversation_id=uuid.UUID(req.conversation_id) if req.conversation_id else None,
        due_at=req.due_at, reminder_at=req.reminder_at,
    )
    db.add(task)
    await db.flush()
    return _task_response(task, creator_name=user.full_name)


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    req: TaskUpdate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task).where(Task.id == uuid.UUID(task_id), Task.org_id == org.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Gorev bulunamadi")

    data = req.model_dump(exclude_unset=True)
    for field, val in data.items():
        if field == "assigned_to" and val:
            val = uuid.UUID(val)
        setattr(task, field, val)

    if req.status == "completed" and not task.completed_at:
        task.completed_at = datetime.now(timezone.utc)

    await db.flush()
    return _task_response(task)


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task).where(Task.id == uuid.UUID(task_id), Task.org_id == org.id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Gorev bulunamadi")
    await db.delete(task)
    return {"ok": True}
