"""Pipelines API — satis hunisi yonetimi."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.models.pipeline import Pipeline, PipelineStage
from app.schemas.pipeline import (
    PipelineCreate, PipelineUpdate, PipelineResponse,
    PipelineStageCreate, PipelineStageResponse,
)

router = APIRouter()


@router.get("", response_model=list[PipelineResponse])
async def list_pipelines(
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pipeline)
        .where(Pipeline.org_id == org.id, Pipeline.is_active == True)
        .options(selectinload(Pipeline.stages))
        .order_by(Pipeline.sort_order)
    )
    pipelines = result.scalars().all()
    return [
        PipelineResponse(
            id=str(p.id), name=p.name, is_default=p.is_default,
            sort_order=p.sort_order, is_active=p.is_active,
            stages=[
                PipelineStageResponse(
                    id=str(s.id), name=s.name, color=s.color,
                    sort_order=s.sort_order, is_win=s.is_win, is_loss=s.is_loss,
                )
                for s in sorted(p.stages, key=lambda x: x.sort_order)
            ],
            created_at=p.created_at,
        )
        for p in pipelines
    ]


@router.post("", response_model=PipelineResponse)
async def create_pipeline(
    req: PipelineCreate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    pipeline = Pipeline(org_id=org.id, name=req.name, is_default=req.is_default)
    db.add(pipeline)
    await db.flush()

    stages = []
    # Varsayilan asamalar olustur eger bos geldiyse
    stage_defs = req.stages or [
        PipelineStageCreate(name="Yeni Lead", color="#6B7280", sort_order=0),
        PipelineStageCreate(name="Ilk Temas", color="#3B82F6", sort_order=1),
        PipelineStageCreate(name="Muzakere", color="#F59E0B", sort_order=2),
        PipelineStageCreate(name="Teklif", color="#8B5CF6", sort_order=3),
        PipelineStageCreate(name="Kazanildi", color="#10B981", sort_order=4, is_win=True),
        PipelineStageCreate(name="Kaybedildi", color="#EF4444", sort_order=5, is_loss=True),
    ]

    for sd in stage_defs:
        stage = PipelineStage(
            pipeline_id=pipeline.id, name=sd.name, color=sd.color,
            sort_order=sd.sort_order, is_win=sd.is_win, is_loss=sd.is_loss,
        )
        db.add(stage)
        stages.append(stage)

    await db.flush()

    return PipelineResponse(
        id=str(pipeline.id), name=pipeline.name, is_default=pipeline.is_default,
        sort_order=pipeline.sort_order, is_active=pipeline.is_active,
        stages=[
            PipelineStageResponse(
                id=str(s.id), name=s.name, color=s.color,
                sort_order=s.sort_order, is_win=s.is_win, is_loss=s.is_loss,
            )
            for s in stages
        ],
        created_at=pipeline.created_at,
    )


@router.patch("/{pipeline_id}", response_model=PipelineResponse)
async def update_pipeline(
    pipeline_id: str,
    req: PipelineUpdate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pipeline)
        .where(Pipeline.id == uuid.UUID(pipeline_id), Pipeline.org_id == org.id)
        .options(selectinload(Pipeline.stages))
    )
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline bulunamadi")

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(pipeline, field, val)
    await db.flush()

    return PipelineResponse(
        id=str(pipeline.id), name=pipeline.name, is_default=pipeline.is_default,
        sort_order=pipeline.sort_order, is_active=pipeline.is_active,
        stages=[
            PipelineStageResponse(
                id=str(s.id), name=s.name, color=s.color,
                sort_order=s.sort_order, is_win=s.is_win, is_loss=s.is_loss,
            )
            for s in sorted(pipeline.stages, key=lambda x: x.sort_order)
        ],
        created_at=pipeline.created_at,
    )


@router.delete("/{pipeline_id}")
async def delete_pipeline(
    pipeline_id: str,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == uuid.UUID(pipeline_id), Pipeline.org_id == org.id)
    )
    pipeline = result.scalar_one_or_none()
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline bulunamadi")
    await db.delete(pipeline)
    return {"ok": True}


# --- Stage CRUD ---

@router.post("/{pipeline_id}/stages", response_model=PipelineStageResponse)
async def create_stage(
    pipeline_id: str,
    req: PipelineStageCreate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Pipeline).where(Pipeline.id == uuid.UUID(pipeline_id), Pipeline.org_id == org.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Pipeline bulunamadi")

    stage = PipelineStage(
        pipeline_id=uuid.UUID(pipeline_id), name=req.name, color=req.color,
        sort_order=req.sort_order, is_win=req.is_win, is_loss=req.is_loss,
    )
    db.add(stage)
    await db.flush()

    return PipelineStageResponse(
        id=str(stage.id), name=stage.name, color=stage.color,
        sort_order=stage.sort_order, is_win=stage.is_win, is_loss=stage.is_loss,
    )


@router.patch("/{pipeline_id}/stages/{stage_id}", response_model=PipelineStageResponse)
async def update_stage(
    pipeline_id: str,
    stage_id: str,
    req: PipelineStageCreate,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PipelineStage).where(
            PipelineStage.id == uuid.UUID(stage_id),
            PipelineStage.pipeline_id == uuid.UUID(pipeline_id),
        )
    )
    stage = result.scalar_one_or_none()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage bulunamadi")

    stage.name = req.name
    stage.color = req.color
    stage.sort_order = req.sort_order
    stage.is_win = req.is_win
    stage.is_loss = req.is_loss
    await db.flush()

    return PipelineStageResponse(
        id=str(stage.id), name=stage.name, color=stage.color,
        sort_order=stage.sort_order, is_win=stage.is_win, is_loss=stage.is_loss,
    )


@router.delete("/{pipeline_id}/stages/{stage_id}")
async def delete_stage(
    pipeline_id: str,
    stage_id: str,
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PipelineStage).where(
            PipelineStage.id == uuid.UUID(stage_id),
            PipelineStage.pipeline_id == uuid.UUID(pipeline_id),
        )
    )
    stage = result.scalar_one_or_none()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage bulunamadi")
    await db.delete(stage)
    return {"ok": True}
