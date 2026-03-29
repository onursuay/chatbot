"""
AdaTrust WhatsApp Chatbot — WhatsApp Cloud API + Gemini AI
Facebook reklamlarından gelen leadleri WhatsApp'ta karşılar,
sohbet eder, potansiyel müşteriyse AI aramaya veya satış yetkilisine aktarır.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional

import httpx
import google.generativeai as genai
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv

load_dotenv()

# ---- LOGGING ----
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("whatsapp_bot.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

# ---- CONFIG ----
WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN")
WHATSAPP_PHONE_ID = os.getenv("WHATSAPP_PHONE_ID")
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_AGENT_ID = os.getenv("ELEVENLABS_AGENT_ID")
ELEVENLABS_PHONE_ID = os.getenv("ELEVENLABS_PHONE_ID")
SALES_PHONE = os.getenv("SALES_PHONE", "905326023199")

GRAPH_API_URL = f"https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_ID}/messages"

# Gemini AI
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")

# ---- KONUŞMA HAFIZASI ----
conversations: Dict[str, List[dict]] = {}

# İşlenmiş mesaj ID'leri (duplikasyon önleme)
processed_messages: set = set()

# ---- SYSTEM PROMPT ----
SYSTEM_PROMPT = """Sen AdaTrust Gayrimenkul'ün WhatsApp asistanısın. Adın Ceylin.

GÖREV:
- Kuzey Kıbrıs'taki gayrimenkul projelerini tanıtmak
- Müşterinin ilgi alanını ve bütçesini anlamak
- İlgilenen müşteriyi satış ekibine yönlendirmek

PROJELER:
1. **The Elysium Girne** - Girne'de lüks konut projesi
2. **Ada Trust Life** - Yaşam odaklı modern proje

KONUŞMA KURALLARI:
- Türkçe konuş, samimi ama profesyonel ol
- Kısa ve öz yanıtlar ver (WhatsApp formatına uygun, max 2-3 cümle)
- Emoji kullanabilirsin ama abartma
- Müşterinin adını öğrenmeye çalış
- Hangi projeyle ilgilendiğini sor
- Bütçe aralığını anlamaya çalış
- Yatırım mı yoksa yaşam amaçlı mı olduğunu öğren

AKTARMA KARARI:
Aşağıdaki durumlardan BİRİ gerçekleşirse, yanıtının SONUNA [TRANSFER_SALES] etiketi ekle:
- Müşteri fiyat bilgisi isterse
- Müşteri ödeme planı sorarsa
- Müşteri "ilgileniyorum", "görmek istiyorum", "randevu" gibi ifadeler kullanırsa
- Müşteri yatırım yapmak istediğini belirtirse
- 3+ mesaj alışverişi olduysa ve müşteri hâlâ ilgiliyse

Aşağıdaki durumda [NOT_INTERESTED] etiketi ekle:
- Müşteri açıkça ilgilenmediğini belirtirse ("hayır", "istemiyorum", "rahatsız etmeyin")

Bu etiketleri yanıtının EN SONUNA ekle, müşteriye gösterme.
"""


# ---- WHATSAPP CLOUD API ----
async def send_whatsapp_message(phone: str, message: str) -> bool:
    """WhatsApp Cloud API ile mesaj gönder."""
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message},
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(GRAPH_API_URL, headers=headers, json=payload)
            data = resp.json()
            if "messages" in data:
                logger.info(f"✓ Mesaj gönderildi → {phone}")
                return True
            else:
                logger.warning(f"✗ Mesaj gönderilemedi → {phone}: {data}")
                return False
        except Exception as e:
            logger.error(f"✗ WhatsApp API hatası: {e}")
            return False


async def mark_as_read(message_id: str):
    """Mesajı okundu olarak işaretle."""
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "status": "read",
        "message_id": message_id,
    }
    async with httpx.AsyncClient() as client:
        try:
            await client.post(GRAPH_API_URL, headers=headers, json=payload)
        except Exception:
            pass


async def notify_sales_team(phone: str, customer_name: str, summary: str):
    """Satış yetkilisine WhatsApp bildirimi gönder."""
    message = (
        f"🔔 *Yeni Potansiyel Müşteri!*\n\n"
        f"👤 *İsim:* {customer_name}\n"
        f"📱 *Telefon:* +{phone}\n"
        f"📝 *Özet:* {summary}\n\n"
        f"Lütfen müşteriyle iletişime geçin."
    )
    await send_whatsapp_message(SALES_PHONE, message)
    logger.info(f"🔔 Satış ekibine bildirim gönderildi: {customer_name} ({phone})")


# ---- ELEVENLABS OUTBOUND ARAMA ----
async def trigger_ai_call(phone: str, customer_name: str, project_name: str = "The Elysium Girne"):
    """ElevenLabs Ceylin agent ile otomatik arama başlat."""
    url = "https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "agent_id": ELEVENLABS_AGENT_ID,
        "agent_phone_number_id": ELEVENLABS_PHONE_ID,
        "to_number": f"+{phone}",
        "conversation_initiation_client_data": {
            "dynamic_variables": {
                "customer_name": customer_name,
                "project_name": project_name,
            }
        },
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, headers=headers, json=payload)
            result = resp.json()
            logger.info(f"📞 AI arama başlatıldı → +{phone}: {result}")
            return result
        except Exception as e:
            logger.error(f"📞 Arama hatası: {e}")
            return None


# ---- AI CHATBOT ----
def get_ai_response(phone: str, user_message: str) -> str:
    """Gemini AI ile chatbot yanıtı üret."""
    if phone not in conversations:
        conversations[phone] = []

    history = conversations[phone]
    history.append({"role": "user", "text": user_message})

    # Son 20 mesajı tut
    if len(history) > 20:
        history = history[-20:]
        conversations[phone] = history

    # Gemini mesaj geçmişi
    chat_messages = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        chat_messages.append({"role": role, "parts": [msg["text"]]})

    try:
        chat = model.start_chat(history=chat_messages[:-1])
        response = chat.send_message(
            chat_messages[-1]["parts"][0],
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=300,
                system_instruction=SYSTEM_PROMPT,
            ),
        )
        ai_text = response.text.strip()

        clean_text = ai_text.replace("[TRANSFER_SALES]", "").replace("[NOT_INTERESTED]", "").strip()
        history.append({"role": "assistant", "text": clean_text})

        return ai_text
    except Exception as e:
        logger.error(f"Gemini AI hatası: {e}")
        return "Şu an teknik bir sorun yaşıyoruz. Kısa süre içinde size dönüş yapacağız. 🙏"


def extract_customer_name(phone: str) -> str:
    """Konuşma geçmişinden müşteri adını çıkar."""
    history = conversations.get(phone, [])
    for msg in history:
        if msg["role"] == "user":
            text = msg["text"]
            if len(text.split()) <= 3 and len(text) > 1 and text[0].isupper():
                return text
    return "Müşteri"


def get_conversation_summary(phone: str) -> str:
    """Konuşma özetini oluştur."""
    history = conversations.get(phone, [])
    if not history:
        return "Konuşma yok"
    user_messages = [m["text"] for m in history if m["role"] == "user"]
    return " | ".join(user_messages[-3:])[:200]


# ---- FASTAPI APP ----
app = FastAPI(title="AdaTrust WhatsApp Chatbot", version="2.0")


@app.get("/")
async def health():
    return {
        "status": "running",
        "bot": "AdaTrust WhatsApp Chatbot (Cloud API)",
        "phone_id": WHATSAPP_PHONE_ID,
        "active_conversations": len(conversations),
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/webhook", response_class=PlainTextResponse)
async def verify_webhook(
    request: Request,
):
    """
    Meta webhook doğrulama (GET).
    Meta bu endpoint'e hub.mode, hub.verify_token, hub.challenge gönderir.
    """
    params = request.query_params
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if mode == "subscribe" and token == WHATSAPP_VERIFY_TOKEN:
        logger.info("✓ Webhook doğrulandı!")
        return challenge
    else:
        logger.warning(f"✗ Webhook doğrulama başarısız — token: {token}")
        raise HTTPException(status_code=403, detail="Verification failed")


@app.post("/webhook")
async def webhook(request: Request):
    """
    Meta webhook endpoint (POST).
    Gelen WhatsApp mesajlarını alır, AI ile yanıtlar.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    logger.info(f"📩 Webhook: {json.dumps(body, ensure_ascii=False)[:500]}")

    # Meta webhook yapısını parse et
    entry = body.get("entry", [])
    if not entry:
        return {"status": "ok"}

    for e in entry:
        changes = e.get("changes", [])
        for change in changes:
            value = change.get("value", {})

            # Sadece gelen mesajları işle
            messages = value.get("messages", [])
            contacts = value.get("contacts", [])

            for msg in messages:
                msg_id = msg.get("id", "")

                # Duplikasyon kontrolü
                if msg_id in processed_messages:
                    logger.info(f"⏭ Duplike mesaj atlandı: {msg_id}")
                    continue
                processed_messages.add(msg_id)

                # Set boyutunu kontrol et (hafıza yönetimi)
                if len(processed_messages) > 10000:
                    processed_messages.clear()

                phone = msg.get("from", "")
                msg_type = msg.get("type", "")

                # Gönderen bilgisi
                sender_name = ""
                if contacts:
                    profile = contacts[0].get("profile", {})
                    sender_name = profile.get("name", "")

                # Sadece text mesajları işle
                if msg_type == "text":
                    text = msg.get("text", {}).get("body", "")
                elif msg_type == "button":
                    text = msg.get("button", {}).get("text", "")
                elif msg_type == "interactive":
                    interactive = msg.get("interactive", {})
                    text = (
                        interactive.get("button_reply", {}).get("title", "")
                        or interactive.get("list_reply", {}).get("title", "")
                    )
                else:
                    logger.info(f"⏭ Desteklenmeyen mesaj tipi: {msg_type}")
                    await send_whatsapp_message(
                        phone,
                        "Şu an sadece yazılı mesajları yanıtlayabiliyorum. Lütfen mesajınızı yazarak gönderin. 📝",
                    )
                    continue

                if not text:
                    continue

                logger.info(f"💬 Gelen — {sender_name} ({phone}): {text}")

                # Okundu bilgisi gönder
                await mark_as_read(msg_id)

                # AI yanıtı al
                ai_response = get_ai_response(phone, text)

                # Etiket kontrolü
                transfer_to_sales = "[TRANSFER_SALES]" in ai_response
                not_interested = "[NOT_INTERESTED]" in ai_response

                # Etiketleri temizle
                clean_response = (
                    ai_response.replace("[TRANSFER_SALES]", "")
                    .replace("[NOT_INTERESTED]", "")
                    .strip()
                )

                # Yanıtı gönder
                sent = await send_whatsapp_message(phone, clean_response)

                # Satışa aktarma
                if transfer_to_sales:
                    customer_name = sender_name or extract_customer_name(phone)
                    summary = get_conversation_summary(phone)
                    await notify_sales_team(phone, customer_name, summary)
                    await send_whatsapp_message(
                        phone,
                        "Satış ekibimiz en kısa sürede sizinle iletişime geçecek. "
                        "Dilerseniz sizi hemen arayabiliriz, uygun musunuz? 📞",
                    )
                    logger.info(f"🔄 SATIŞ AKTARMA → {customer_name} ({phone})")

                if not_interested:
                    logger.info(f"❌ İlgilenmiyor → {phone}")
                    conversations.pop(phone, None)

    return {"status": "ok"}


@app.get("/conversations")
async def list_conversations():
    """Aktif konuşmaları listele."""
    result = {}
    for phone, messages in conversations.items():
        result[phone] = {
            "message_count": len(messages),
            "last_message": messages[-1] if messages else None,
        }
    return result


@app.get("/conversations/{phone}")
async def get_conversation(phone: str):
    """Belirli bir konuşmanın detayını getir."""
    if phone not in conversations:
        raise HTTPException(status_code=404, detail="Konuşma bulunamadı")
    return {"phone": phone, "messages": conversations[phone]}


@app.post("/trigger-call/{phone}")
async def manual_trigger_call(phone: str, name: str = "Müşteri", project: str = "The Elysium Girne"):
    """Manuel olarak AI arama tetikle."""
    result = await trigger_ai_call(phone, name, project)
    return {"status": "call_initiated", "result": result}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info(f"🚀 AdaTrust WhatsApp Bot başlatılıyor — port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
