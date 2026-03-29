"""
WaAPI Platform — Uygulama Yapılandırması
pydantic-settings ile ortam değişkenlerinden yüklenir.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # --- App ---
    APP_NAME: str = "WaAPI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    SECRET_KEY: str = "change-me-in-production"
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000"]

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://waapi:waapi@localhost:5432/waapi"

    # --- Redis ---
    REDIS_URL: str = "redis://localhost:6379/0"

    # --- JWT Auth ---
    JWT_SECRET: str = "change-me-jwt-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Meta / WhatsApp ---
    META_APP_ID: str = ""
    META_APP_SECRET: str = ""
    META_WEBHOOK_VERIFY_TOKEN: str = "waapi_webhook_verify_2026"
    META_GRAPH_API_VERSION: str = "v21.0"

    # --- AI ---
    GEMINI_API_KEY: str = ""
    DEFAULT_AI_MODEL: str = "gemini-2.5-flash"
    DEFAULT_AI_TEMPERATURE: float = 0.7
    DEFAULT_AI_MAX_TOKENS: int = 300

    # --- ElevenLabs (opsiyonel) ---
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_AGENT_ID: str = ""
    ELEVENLABS_PHONE_ID: str = ""

    # --- Encryption ---
    ENCRYPTION_KEY: str = "change-me-fernet-key"

    # --- Media Storage ---
    MEDIA_STORAGE: str = "local"  # local, s3, r2
    S3_BUCKET: str = ""
    S3_ENDPOINT: str = ""
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""

    @property
    def graph_api_base(self) -> str:
        return f"https://graph.facebook.com/{self.META_GRAPH_API_VERSION}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
