"""Broadcast worker — toplu mesaj gonderimi."""

import asyncio
import logging

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="send_broadcast")
def send_broadcast(broadcast_id: str):
    """Broadcast mesajlarini siraya alip gonder."""
    # Faz 3'te implemente edilecek
    logger.info(f"Broadcast gorevi: {broadcast_id}")
