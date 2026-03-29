"""Auth API routes — kayit, giris, token yenileme, profil."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user, get_current_org
from app.models.user import User
from app.models.organization import Organization
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshRequest, TokenResponse, UserResponse
from app.services.auth_service import register, login
from app.utils.security import decode_token, create_access_token

router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register_user(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, org, tokens = await register(db, req.email, req.password, req.full_name, req.org_name)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login_user(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    try:
        user, org, tokens = await login(db, req.email, req.password)
        return tokens
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(req: RefreshRequest):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Gecersiz refresh token")

    new_payload = {k: v for k, v in payload.items() if k not in ("exp", "type")}
    return {
        "access_token": create_access_token(new_payload),
        "refresh_token": req.refresh_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_user),
    org: Organization = Depends(get_current_org),
):
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        org_id=str(org.id),
        org_name=org.name,
        org_slug=org.slug,
        org_plan=org.plan,
    )
