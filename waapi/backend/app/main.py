"""
WaAPI Platform — FastAPI Uygulama Fabrikasi
WhatsApp Business SaaS Platform (Tech Provider)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.v1.router import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama baslatma/kapatma olaylari."""
    # Startup
    settings = get_settings()
    print(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION} baslatiliyor...")
    yield
    # Shutdown
    print("👋 Uygulama kapatiliyor...")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="WhatsApp Business SaaS Platform — Tech Provider",
        lifespan=lifespan,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API v1 Routes
    app.include_router(api_v1_router, prefix="/api/v1")

    # Health check
    @app.get("/")
    async def health():
        return {
            "status": "running",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    return app


app = create_app()
