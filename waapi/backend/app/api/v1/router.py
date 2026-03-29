"""API v1 — Tum route'lari birlestiren ana router."""

from fastapi import APIRouter

from app.api.v1 import (
    auth, webhook, conversations, contacts, embedded_signup,
    pipelines, leads, companies, tasks, crm, chatbot,
)
from app.websocket.inbox import router as ws_router

api_v1_router = APIRouter()

# Auth & Webhook
api_v1_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_v1_router.include_router(webhook.router, prefix="/webhook", tags=["Webhook"])
api_v1_router.include_router(ws_router, tags=["WebSocket"])
api_v1_router.include_router(embedded_signup.router, prefix="/embedded-signup", tags=["Embedded Signup"])

# Messaging
api_v1_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
api_v1_router.include_router(contacts.router, prefix="/contacts", tags=["Contacts"])

# CRM — Pipeline & Leads (Kommo)
api_v1_router.include_router(pipelines.router, prefix="/pipelines", tags=["Pipelines"])
api_v1_router.include_router(leads.router, prefix="/leads", tags=["Leads"])
api_v1_router.include_router(companies.router, prefix="/companies", tags=["Companies"])
api_v1_router.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])

# AI Chatbot
api_v1_router.include_router(chatbot.router, prefix="/chatbot", tags=["Chatbot"])

# CRM — Tags, Custom Fields, Activity, Webhooks, Forms, Team, Calls, Emails, Flows, Widgets, Scoring, Filters
api_v1_router.include_router(crm.router, prefix="/crm", tags=["CRM"])


@api_v1_router.get("/ping")
async def ping():
    return {"message": "pong"}
