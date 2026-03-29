"""Celery uygulama yapilandirmasi."""

from celery import Celery

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "waapi",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Istanbul",
    enable_utc=True,
    task_track_started=True,
    task_default_queue="default",
    task_routes={
        "app.workers.broadcast_worker.*": {"queue": "broadcast"},
    },
)

celery_app.autodiscover_tasks(["app.workers"])
