"""CRM API — tags, custom fields, activity logs, webhooks, web forms, team, calls, emails, widgets, filters, scoring."""

import uuid
import secrets
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.models.tag import Tag
from app.models.custom_field import CustomFieldDefinition, CustomFieldValue
from app.models.activity_log import ActivityLog
from app.models.webhook_config import WebhookConfig
from app.models.web_form import WebForm, FormSubmission
from app.models.team_invitation import TeamInvitation
from app.models.call_log import CallLog
from app.models.email_log import EmailLog
from app.models.dashboard_widget import DashboardWidget
from app.models.lead_scoring import LeadScoringRule
from app.models.saved_filter import SavedFilter
from app.models.salesbot_flow import SalesbotFlow, SalesbotFlowStep

from app.schemas.crm import (
    TagCreate, TagUpdate, TagResponse,
    CustomFieldCreate, CustomFieldResponse, CustomFieldValueSet,
    ActivityLogResponse,
    WebhookConfigCreate, WebhookConfigUpdate, WebhookConfigResponse,
    WebFormCreate, WebFormUpdate, WebFormResponse,
    TeamInvitationCreate, TeamInvitationResponse,
    CallLogCreate, CallLogResponse,
    EmailLogCreate, EmailLogResponse,
    SalesbotFlowCreate, SalesbotFlowUpdate, SalesbotFlowResponse, SalesbotFlowStepCreate, SalesbotFlowStepResponse,
    DashboardWidgetCreate, DashboardWidgetUpdate, DashboardWidgetResponse,
    LeadScoringRuleCreate, LeadScoringRuleResponse,
    SavedFilterCreate, SavedFilterResponse,
)

router = APIRouter()


# ===================== TAGS =====================

@router.get("/tags", response_model=list[TagResponse], tags=["Tags"])
async def list_tags(
    entity_type: str | None = None,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(Tag).where(Tag.org_id == org.id)
    if entity_type:
        query = query.where(Tag.entity_type == entity_type)
    result = await db.execute(query.order_by(Tag.name))
    return [TagResponse(id=str(t.id), name=t.name, color=t.color, entity_type=t.entity_type, usage_count=t.usage_count) for t in result.scalars().all()]


@router.post("/tags", response_model=TagResponse, tags=["Tags"])
async def create_tag(req: TagCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    tag = Tag(org_id=org.id, name=req.name, color=req.color, entity_type=req.entity_type)
    db.add(tag)
    await db.flush()
    return TagResponse(id=str(tag.id), name=tag.name, color=tag.color, entity_type=tag.entity_type, usage_count=0)


@router.delete("/tags/{tag_id}", tags=["Tags"])
async def delete_tag(tag_id: str, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tag).where(Tag.id == uuid.UUID(tag_id), Tag.org_id == org.id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag bulunamadi")
    await db.delete(tag)
    return {"ok": True}


# ===================== CUSTOM FIELDS =====================

@router.get("/custom-fields", response_model=list[CustomFieldResponse], tags=["Custom Fields"])
async def list_custom_fields(
    entity_type: str | None = None,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(CustomFieldDefinition).where(CustomFieldDefinition.org_id == org.id)
    if entity_type:
        query = query.where(CustomFieldDefinition.entity_type == entity_type)
    result = await db.execute(query.order_by(CustomFieldDefinition.sort_order))
    return [
        CustomFieldResponse(
            id=str(f.id), entity_type=f.entity_type, field_name=f.field_name,
            field_label=f.field_label, field_type=f.field_type, options=f.options or [],
            is_required=f.is_required, is_visible=f.is_visible, sort_order=f.sort_order,
            default_value=f.default_value, placeholder=f.placeholder,
        )
        for f in result.scalars().all()
    ]


@router.post("/custom-fields", response_model=CustomFieldResponse, tags=["Custom Fields"])
async def create_custom_field(req: CustomFieldCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    field = CustomFieldDefinition(
        org_id=org.id, entity_type=req.entity_type, field_name=req.field_name,
        field_label=req.field_label, field_type=req.field_type, options=req.options,
        is_required=req.is_required, sort_order=req.sort_order,
        default_value=req.default_value, placeholder=req.placeholder,
    )
    db.add(field)
    await db.flush()
    return CustomFieldResponse(
        id=str(field.id), entity_type=field.entity_type, field_name=field.field_name,
        field_label=field.field_label, field_type=field.field_type, options=field.options or [],
        is_required=field.is_required, is_visible=True, sort_order=field.sort_order,
        default_value=field.default_value, placeholder=field.placeholder,
    )


@router.delete("/custom-fields/{field_id}", tags=["Custom Fields"])
async def delete_custom_field(field_id: str, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CustomFieldDefinition).where(CustomFieldDefinition.id == uuid.UUID(field_id), CustomFieldDefinition.org_id == org.id))
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Alan bulunamadi")
    await db.delete(field)
    return {"ok": True}


@router.put("/custom-fields/values/{entity_type}/{entity_id}", tags=["Custom Fields"])
async def set_custom_field_values(
    entity_type: str, entity_id: str, values: list[CustomFieldValueSet],
    user: User = Depends(get_current_user), org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    for v in values:
        existing = await db.execute(
            select(CustomFieldValue).where(
                CustomFieldValue.field_id == uuid.UUID(v.field_id),
                CustomFieldValue.entity_id == uuid.UUID(entity_id),
            )
        )
        cfv = existing.scalar_one_or_none()
        if cfv:
            cfv.value = v.value
        else:
            db.add(CustomFieldValue(
                field_id=uuid.UUID(v.field_id), entity_id=uuid.UUID(entity_id),
                entity_type=entity_type, value=v.value,
            ))
    await db.flush()
    return {"ok": True}


# ===================== ACTIVITY LOGS =====================

@router.get("/activity-logs", response_model=list[ActivityLogResponse], tags=["Activity"])
async def list_activity_logs(
    entity_type: str | None = None, entity_id: str | None = None,
    page: int = Query(1, ge=1), per_page: int = Query(25, ge=1, le=100),
    user: User = Depends(get_current_user), org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(ActivityLog).where(ActivityLog.org_id == org.id)
    if entity_type:
        query = query.where(ActivityLog.entity_type == entity_type)
    if entity_id:
        query = query.where(ActivityLog.entity_id == uuid.UUID(entity_id))
    query = query.order_by(ActivityLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)

    responses = []
    for a in result.scalars().all():
        user_name = None
        if a.user_id:
            u = await db.get(User, a.user_id)
            user_name = u.full_name if u else None
        responses.append(ActivityLogResponse(
            id=str(a.id), user_id=str(a.user_id) if a.user_id else None,
            user_name=user_name, entity_type=a.entity_type,
            entity_id=str(a.entity_id), action=a.action,
            old_value=a.old_value, new_value=a.new_value, created_at=a.created_at,
        ))
    return responses


# ===================== WEBHOOK CONFIGS =====================

@router.get("/webhooks", response_model=list[WebhookConfigResponse], tags=["Webhooks"])
async def list_webhooks(user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfig).where(WebhookConfig.org_id == org.id))
    return [
        WebhookConfigResponse(
            id=str(w.id), name=w.name, url=w.url, events=w.events or [],
            is_active=w.is_active, retry_count=w.retry_count,
            last_triggered_at=w.last_triggered_at, last_status_code=w.last_status_code,
            failure_count=w.failure_count, created_at=w.created_at,
        )
        for w in result.scalars().all()
    ]


@router.post("/webhooks", response_model=WebhookConfigResponse, tags=["Webhooks"])
async def create_webhook(req: WebhookConfigCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    wh = WebhookConfig(org_id=org.id, name=req.name, url=req.url, secret=req.secret, events=req.events)
    db.add(wh)
    await db.flush()
    return WebhookConfigResponse(
        id=str(wh.id), name=wh.name, url=wh.url, events=wh.events or [],
        is_active=True, retry_count=3, last_triggered_at=None,
        last_status_code=None, failure_count=0, created_at=wh.created_at,
    )


@router.patch("/webhooks/{webhook_id}", response_model=WebhookConfigResponse, tags=["Webhooks"])
async def update_webhook(webhook_id: str, req: WebhookConfigUpdate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfig).where(WebhookConfig.id == uuid.UUID(webhook_id), WebhookConfig.org_id == org.id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook bulunamadi")
    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(wh, field, val)
    await db.flush()
    return WebhookConfigResponse(
        id=str(wh.id), name=wh.name, url=wh.url, events=wh.events or [],
        is_active=wh.is_active, retry_count=wh.retry_count,
        last_triggered_at=wh.last_triggered_at, last_status_code=wh.last_status_code,
        failure_count=wh.failure_count, created_at=wh.created_at,
    )


@router.delete("/webhooks/{webhook_id}", tags=["Webhooks"])
async def delete_webhook(webhook_id: str, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebhookConfig).where(WebhookConfig.id == uuid.UUID(webhook_id), WebhookConfig.org_id == org.id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook bulunamadi")
    await db.delete(wh)
    return {"ok": True}


# ===================== WEB FORMS =====================

@router.get("/web-forms", response_model=list[WebFormResponse], tags=["Web Forms"])
async def list_web_forms(user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebForm).where(WebForm.org_id == org.id).order_by(WebForm.created_at.desc()))
    return [
        WebFormResponse(
            id=str(f.id), name=f.name, slug=f.slug,
            pipeline_id=str(f.pipeline_id) if f.pipeline_id else None,
            stage_id=str(f.stage_id) if f.stage_id else None,
            assigned_to=str(f.assigned_to) if f.assigned_to else None,
            fields=f.fields or [], settings=f.settings or {}, style=f.style or {},
            is_active=f.is_active, submission_count=f.submission_count,
            created_at=f.created_at,
        )
        for f in result.scalars().all()
    ]


@router.post("/web-forms", response_model=WebFormResponse, tags=["Web Forms"])
async def create_web_form(req: WebFormCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    form = WebForm(
        org_id=org.id, name=req.name, slug=req.slug,
        pipeline_id=uuid.UUID(req.pipeline_id) if req.pipeline_id else None,
        stage_id=uuid.UUID(req.stage_id) if req.stage_id else None,
        assigned_to=uuid.UUID(req.assigned_to) if req.assigned_to else None,
        fields=req.fields, settings=req.settings, style=req.style,
    )
    db.add(form)
    await db.flush()
    return WebFormResponse(
        id=str(form.id), name=form.name, slug=form.slug,
        pipeline_id=str(form.pipeline_id) if form.pipeline_id else None,
        stage_id=str(form.stage_id) if form.stage_id else None,
        assigned_to=str(form.assigned_to) if form.assigned_to else None,
        fields=form.fields or [], settings=form.settings or {}, style=form.style or {},
        is_active=True, submission_count=0, created_at=form.created_at,
    )


@router.delete("/web-forms/{form_id}", tags=["Web Forms"])
async def delete_web_form(form_id: str, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WebForm).where(WebForm.id == uuid.UUID(form_id), WebForm.org_id == org.id))
    form = result.scalar_one_or_none()
    if not form:
        raise HTTPException(status_code=404, detail="Form bulunamadi")
    await db.delete(form)
    return {"ok": True}


# ===================== TEAM INVITATIONS =====================

@router.get("/team/invitations", response_model=list[TeamInvitationResponse], tags=["Team"])
async def list_invitations(user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TeamInvitation).where(TeamInvitation.org_id == org.id).order_by(TeamInvitation.created_at.desc()))
    return [
        TeamInvitationResponse(
            id=str(i.id), email=i.email, role=i.role, status=i.status,
            expires_at=i.expires_at, accepted_at=i.accepted_at, created_at=i.created_at,
        )
        for i in result.scalars().all()
    ]


@router.post("/team/invitations", response_model=TeamInvitationResponse, tags=["Team"])
async def create_invitation(req: TeamInvitationCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    invitation = TeamInvitation(
        org_id=org.id, invited_by=user.id, email=req.email, role=req.role,
        token=secrets.token_urlsafe(32),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(invitation)
    await db.flush()
    return TeamInvitationResponse(
        id=str(invitation.id), email=invitation.email, role=invitation.role,
        status="pending", expires_at=invitation.expires_at,
        accepted_at=None, created_at=invitation.created_at,
    )


@router.delete("/team/invitations/{invitation_id}", tags=["Team"])
async def cancel_invitation(invitation_id: str, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TeamInvitation).where(TeamInvitation.id == uuid.UUID(invitation_id), TeamInvitation.org_id == org.id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Davet bulunamadi")
    inv.status = "cancelled"
    await db.flush()
    return {"ok": True}


@router.get("/team/members", tags=["Team"])
async def list_team_members(user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.org_id == org.id, User.is_active == True))
    return [
        {"id": str(u.id), "email": u.email, "full_name": u.full_name, "role": u.role, "last_login_at": u.last_login_at}
        for u in result.scalars().all()
    ]


# ===================== CALL LOGS =====================

@router.get("/calls", response_model=list[CallLogResponse], tags=["Calls"])
async def list_calls(
    contact_id: str | None = None, lead_id: str | None = None,
    page: int = Query(1, ge=1), per_page: int = Query(25, ge=1, le=100),
    user: User = Depends(get_current_user), org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(CallLog).where(CallLog.org_id == org.id)
    if contact_id:
        query = query.where(CallLog.contact_id == uuid.UUID(contact_id))
    if lead_id:
        query = query.where(CallLog.lead_id == uuid.UUID(lead_id))
    query = query.order_by(CallLog.started_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return [
        CallLogResponse(
            id=str(c.id), user_id=str(c.user_id) if c.user_id else None,
            contact_id=str(c.contact_id) if c.contact_id else None,
            lead_id=str(c.lead_id) if c.lead_id else None,
            direction=c.direction, status=c.status, phone_from=c.phone_from,
            phone_to=c.phone_to, duration_seconds=c.duration_seconds,
            recording_url=c.recording_url, notes=c.notes,
            started_at=c.started_at, ended_at=c.ended_at,
        )
        for c in result.scalars().all()
    ]


@router.post("/calls", response_model=CallLogResponse, tags=["Calls"])
async def create_call_log(req: CallLogCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    call = CallLog(
        org_id=org.id, user_id=user.id, direction=req.direction,
        contact_id=uuid.UUID(req.contact_id) if req.contact_id else None,
        lead_id=uuid.UUID(req.lead_id) if req.lead_id else None,
        phone_from=req.phone_from, phone_to=req.phone_to,
        duration_seconds=req.duration_seconds, notes=req.notes,
    )
    db.add(call)
    await db.flush()
    return CallLogResponse(
        id=str(call.id), user_id=str(call.user_id), contact_id=str(call.contact_id) if call.contact_id else None,
        lead_id=str(call.lead_id) if call.lead_id else None, direction=call.direction,
        status=call.status, phone_from=call.phone_from, phone_to=call.phone_to,
        duration_seconds=call.duration_seconds, recording_url=None, notes=call.notes,
        started_at=call.started_at, ended_at=None,
    )


# ===================== EMAIL LOGS =====================

@router.get("/emails", response_model=list[EmailLogResponse], tags=["Emails"])
async def list_emails(
    contact_id: str | None = None, lead_id: str | None = None,
    page: int = Query(1, ge=1), per_page: int = Query(25, ge=1, le=100),
    user: User = Depends(get_current_user), org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(EmailLog).where(EmailLog.org_id == org.id)
    if contact_id:
        query = query.where(EmailLog.contact_id == uuid.UUID(contact_id))
    if lead_id:
        query = query.where(EmailLog.lead_id == uuid.UUID(lead_id))
    query = query.order_by(EmailLog.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    return [
        EmailLogResponse(
            id=str(e.id), user_id=str(e.user_id) if e.user_id else None,
            contact_id=str(e.contact_id) if e.contact_id else None,
            lead_id=str(e.lead_id) if e.lead_id else None,
            direction=e.direction, from_email=e.from_email, to_email=e.to_email,
            subject=e.subject, status=e.status, opened_at=e.opened_at,
            clicked_at=e.clicked_at, created_at=e.created_at,
        )
        for e in result.scalars().all()
    ]


@router.post("/emails", response_model=EmailLogResponse, tags=["Emails"])
async def create_email_log(req: EmailLogCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    email = EmailLog(
        org_id=org.id, user_id=user.id, direction="outbound",
        from_email=user.email, to_email=req.to_email,
        contact_id=uuid.UUID(req.contact_id) if req.contact_id else None,
        lead_id=uuid.UUID(req.lead_id) if req.lead_id else None,
        subject=req.subject, body_html=req.body_html, body_text=req.body_text,
    )
    db.add(email)
    await db.flush()
    return EmailLogResponse(
        id=str(email.id), user_id=str(email.user_id), contact_id=str(email.contact_id) if email.contact_id else None,
        lead_id=str(email.lead_id) if email.lead_id else None,
        direction="outbound", from_email=email.from_email, to_email=email.to_email,
        subject=email.subject, status="sent", opened_at=None, clicked_at=None,
        created_at=email.created_at,
    )


# ===================== SALESBOT FLOWS =====================

@router.get("/flows", response_model=list[SalesbotFlowResponse], tags=["Salesbot Flows"])
async def list_flows(user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(SalesbotFlow).where(SalesbotFlow.org_id == org.id)
        .options(selectinload(SalesbotFlow.steps))
        .order_by(SalesbotFlow.created_at.desc())
    )
    return [
        SalesbotFlowResponse(
            id=str(f.id), name=f.name, description=f.description,
            trigger_type=f.trigger_type, trigger_config=f.trigger_config or {},
            is_active=f.is_active, version=f.version, published_at=f.published_at,
            stats=f.stats or {},
            steps=[
                SalesbotFlowStepResponse(
                    id=str(s.id), step_type=s.step_type, config=s.config or {},
                    position_x=s.position_x, position_y=s.position_y,
                    next_step_id=str(s.next_step_id) if s.next_step_id else None,
                    true_step_id=str(s.true_step_id) if s.true_step_id else None,
                    false_step_id=str(s.false_step_id) if s.false_step_id else None,
                    sort_order=s.sort_order,
                )
                for s in sorted(f.steps, key=lambda x: x.sort_order)
            ],
            created_at=f.created_at,
        )
        for f in result.scalars().all()
    ]


@router.post("/flows", response_model=SalesbotFlowResponse, tags=["Salesbot Flows"])
async def create_flow(req: SalesbotFlowCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    flow = SalesbotFlow(
        org_id=org.id, name=req.name, description=req.description,
        trigger_type=req.trigger_type, trigger_config=req.trigger_config,
    )
    db.add(flow)
    await db.flush()
    return SalesbotFlowResponse(
        id=str(flow.id), name=flow.name, description=flow.description,
        trigger_type=flow.trigger_type, trigger_config=flow.trigger_config or {},
        is_active=False, version=1, published_at=None,
        stats={"triggered": 0, "completed": 0, "dropped": 0},
        steps=[], created_at=flow.created_at,
    )


@router.patch("/flows/{flow_id}", response_model=SalesbotFlowResponse, tags=["Salesbot Flows"])
async def update_flow(flow_id: str, req: SalesbotFlowUpdate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SalesbotFlow).where(SalesbotFlow.id == uuid.UUID(flow_id), SalesbotFlow.org_id == org.id))
    flow = result.scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow bulunamadi")
    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(flow, field, val)
    if req.is_active and not flow.published_at:
        flow.published_at = datetime.now(timezone.utc)
    await db.flush()
    return SalesbotFlowResponse(
        id=str(flow.id), name=flow.name, description=flow.description,
        trigger_type=flow.trigger_type, trigger_config=flow.trigger_config or {},
        is_active=flow.is_active, version=flow.version, published_at=flow.published_at,
        stats=flow.stats or {}, steps=[], created_at=flow.created_at,
    )


@router.post("/flows/{flow_id}/steps", response_model=SalesbotFlowStepResponse, tags=["Salesbot Flows"])
async def create_flow_step(flow_id: str, req: SalesbotFlowStepCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    step = SalesbotFlowStep(
        flow_id=uuid.UUID(flow_id), step_type=req.step_type, config=req.config,
        position_x=req.position_x, position_y=req.position_y,
        next_step_id=uuid.UUID(req.next_step_id) if req.next_step_id else None,
        true_step_id=uuid.UUID(req.true_step_id) if req.true_step_id else None,
        false_step_id=uuid.UUID(req.false_step_id) if req.false_step_id else None,
        sort_order=req.sort_order,
    )
    db.add(step)
    await db.flush()
    return SalesbotFlowStepResponse(
        id=str(step.id), step_type=step.step_type, config=step.config or {},
        position_x=step.position_x, position_y=step.position_y,
        next_step_id=str(step.next_step_id) if step.next_step_id else None,
        true_step_id=str(step.true_step_id) if step.true_step_id else None,
        false_step_id=str(step.false_step_id) if step.false_step_id else None,
        sort_order=step.sort_order,
    )


@router.delete("/flows/{flow_id}", tags=["Salesbot Flows"])
async def delete_flow(flow_id: str, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SalesbotFlow).where(SalesbotFlow.id == uuid.UUID(flow_id), SalesbotFlow.org_id == org.id))
    flow = result.scalar_one_or_none()
    if not flow:
        raise HTTPException(status_code=404, detail="Flow bulunamadi")
    await db.delete(flow)
    return {"ok": True}


# ===================== DASHBOARD WIDGETS =====================

@router.get("/widgets", response_model=list[DashboardWidgetResponse], tags=["Dashboard"])
async def list_widgets(user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DashboardWidget).where(DashboardWidget.user_id == user.id).order_by(DashboardWidget.position_y, DashboardWidget.position_x))
    return [
        DashboardWidgetResponse(
            id=str(w.id), widget_type=w.widget_type, title=w.title,
            config=w.config or {}, position_x=w.position_x, position_y=w.position_y,
            width=w.width, height=w.height, is_visible=w.is_visible,
        )
        for w in result.scalars().all()
    ]


@router.post("/widgets", response_model=DashboardWidgetResponse, tags=["Dashboard"])
async def create_widget(req: DashboardWidgetCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    widget = DashboardWidget(
        org_id=org.id, user_id=user.id, widget_type=req.widget_type,
        title=req.title, config=req.config, position_x=req.position_x,
        position_y=req.position_y, width=req.width, height=req.height,
    )
    db.add(widget)
    await db.flush()
    return DashboardWidgetResponse(
        id=str(widget.id), widget_type=widget.widget_type, title=widget.title,
        config=widget.config or {}, position_x=widget.position_x,
        position_y=widget.position_y, width=widget.width, height=widget.height,
        is_visible=True,
    )


@router.patch("/widgets/{widget_id}", response_model=DashboardWidgetResponse, tags=["Dashboard"])
async def update_widget(widget_id: str, req: DashboardWidgetUpdate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DashboardWidget).where(DashboardWidget.id == uuid.UUID(widget_id), DashboardWidget.user_id == user.id))
    widget = result.scalar_one_or_none()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget bulunamadi")
    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(widget, field, val)
    await db.flush()
    return DashboardWidgetResponse(
        id=str(widget.id), widget_type=widget.widget_type, title=widget.title,
        config=widget.config or {}, position_x=widget.position_x,
        position_y=widget.position_y, width=widget.width, height=widget.height,
        is_visible=widget.is_visible,
    )


@router.delete("/widgets/{widget_id}", tags=["Dashboard"])
async def delete_widget(widget_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DashboardWidget).where(DashboardWidget.id == uuid.UUID(widget_id), DashboardWidget.user_id == user.id))
    widget = result.scalar_one_or_none()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget bulunamadi")
    await db.delete(widget)
    return {"ok": True}


# ===================== LEAD SCORING RULES =====================

@router.get("/scoring-rules", response_model=list[LeadScoringRuleResponse], tags=["Lead Scoring"])
async def list_scoring_rules(user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeadScoringRule).where(LeadScoringRule.org_id == org.id))
    return [
        LeadScoringRuleResponse(
            id=str(r.id), name=r.name, condition_type=r.condition_type,
            condition_config=r.condition_config or {}, score_delta=r.score_delta, is_active=r.is_active,
        )
        for r in result.scalars().all()
    ]


@router.post("/scoring-rules", response_model=LeadScoringRuleResponse, tags=["Lead Scoring"])
async def create_scoring_rule(req: LeadScoringRuleCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    rule = LeadScoringRule(org_id=org.id, name=req.name, condition_type=req.condition_type, condition_config=req.condition_config, score_delta=req.score_delta)
    db.add(rule)
    await db.flush()
    return LeadScoringRuleResponse(id=str(rule.id), name=rule.name, condition_type=rule.condition_type, condition_config=rule.condition_config or {}, score_delta=rule.score_delta, is_active=True)


@router.delete("/scoring-rules/{rule_id}", tags=["Lead Scoring"])
async def delete_scoring_rule(rule_id: str, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LeadScoringRule).where(LeadScoringRule.id == uuid.UUID(rule_id), LeadScoringRule.org_id == org.id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Kural bulunamadi")
    await db.delete(rule)
    return {"ok": True}


# ===================== SAVED FILTERS =====================

@router.get("/saved-filters", response_model=list[SavedFilterResponse], tags=["Saved Filters"])
async def list_saved_filters(
    entity_type: str | None = None,
    user: User = Depends(get_current_user), org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    query = select(SavedFilter).where(
        SavedFilter.org_id == org.id,
        (SavedFilter.user_id == user.id) | (SavedFilter.is_shared == True),
    )
    if entity_type:
        query = query.where(SavedFilter.entity_type == entity_type)
    result = await db.execute(query)
    return [
        SavedFilterResponse(
            id=str(f.id), name=f.name, entity_type=f.entity_type,
            filters=f.filters or {}, is_default=f.is_default, is_shared=f.is_shared,
            created_at=f.created_at,
        )
        for f in result.scalars().all()
    ]


@router.post("/saved-filters", response_model=SavedFilterResponse, tags=["Saved Filters"])
async def create_saved_filter(req: SavedFilterCreate, user: User = Depends(get_current_user), org: Organization = Depends(get_current_org), db: AsyncSession = Depends(get_db)):
    f = SavedFilter(org_id=org.id, user_id=user.id, name=req.name, entity_type=req.entity_type, filters=req.filters, is_shared=req.is_shared)
    db.add(f)
    await db.flush()
    return SavedFilterResponse(id=str(f.id), name=f.name, entity_type=f.entity_type, filters=f.filters or {}, is_default=False, is_shared=f.is_shared, created_at=f.created_at)


@router.delete("/saved-filters/{filter_id}", tags=["Saved Filters"])
async def delete_saved_filter(filter_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SavedFilter).where(SavedFilter.id == uuid.UUID(filter_id), SavedFilter.user_id == user.id))
    f = result.scalar_one_or_none()
    if not f:
        raise HTTPException(status_code=404, detail="Filtre bulunamadi")
    await db.delete(f)
    return {"ok": True}
