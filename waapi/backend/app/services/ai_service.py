"""AI Chatbot service — tenant basina Gemini entegrasyonu.
Knowledge base + system prompt + konusma gecmisi ile akilli yanit uretir.
"""

import logging

import google.generativeai as genai
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.chatbot import ChatbotConfig
from app.models.message import Message

logger = logging.getLogger(__name__)
REQUEST_CONTACT_TAG = "[REQUEST_CONTACT]"


def _normalize_ai_response(text: str) -> str:
    clean = text.strip()
    lower = clean.lower()
    fallback_patterns = [
        "bilgi bankas",
        "bilgi taban",
        "bulunmamaktad",
        "bulunamadi",
        "yetkiliye baglan",
        "bir yetkiliye",
        "yardimci olabilecek bir yetkili",
    ]

    if any(pattern in lower for pattern in fallback_patterns):
        return REQUEST_CONTACT_TAG

    return clean


def _build_system_instruction(config: ChatbotConfig) -> str:
    """System prompt + knowledge base'i birlestir."""
    parts = []

    # Ana system prompt
    if config.system_prompt:
        parts.append(config.system_prompt.strip())

    # Knowledge base (hizmetler, fiyatlar, SSS vs.)
    knowledge_base = ""
    if config.settings and isinstance(config.settings, dict):
        knowledge_base = config.settings.get("knowledge_base", "")

    if knowledge_base:
        parts.append(f"""

--- BILGI TABANI ---
Asagidaki bilgiler isletmenin sundugu hizmetler, urunler, fiyatlar ve sik sorulan sorulardir.
Musteri sorularini bu bilgilere dayanarak yanitla. Bilgi tabaninda olmayan konularda uydurma,
"Bu konuda size yardimci olabilecek bir yetkiliye baglayalim" de.

{knowledge_base}
--- BILGI TABANI SONU ---
""")

    # Genel kurallar
    parts.append("""
KURALLAR:
- Kisa, oz ve dogal yanitlar ver. Uzun paragraflar yazma.
- Musteriyle WhatsApp'ta sohbet ediyorsun gibi yaz, resmi mektup gibi degil.
- Fiyat soruldugunda bilgi tabanindaki fiyatlari ver.
- Randevu/rezervasyon istenirse bilgi tabanindaki yonergeleri takip et.
- Musteri israrla gercek kisiyle konusmak isterse [TRANSFER_SALES] etiketini yanitinin sonuna ekle.
- Musteri ilgilenmedigini net belirtirse [NOT_INTERESTED] etiketini ekle.
- Eger soruya yeterli ve guvenli cevap veremiyorsan normal aciklama yazmak yerine sadece [REQUEST_CONTACT] etiketiyle yanit ver.
- Asla "bilgi bankasinda yok", "bilgiler bulunmamaktadir" veya "yetkiliye baglayalim" gibi ifadeler kullanma.
- Emoji kullanabilirsin ama abartma.
- Turkce yanit ver (musteri baska dilde yazarsa o dilde yanit ver).
""")

    return "\n".join(parts)


async def get_ai_response(
    db: AsyncSession,
    org_id: str,
    conversation_id: str,
    user_message: str,
) -> str:
    """Tenant'in chatbot config'ine gore AI yanit uret."""

    # Chatbot config'i DB'den al
    result = await db.execute(
        select(ChatbotConfig).where(
            ChatbotConfig.org_id == org_id,
            ChatbotConfig.is_active == True,
        )
    )
    config = result.scalar_one_or_none()

    if not config:
        return "Bot yapilandirmasi bulunamadi."

    settings = get_settings()
    genai.configure(api_key=settings.GEMINI_API_KEY)

    model_name = config.ai_model or settings.DEFAULT_AI_MODEL
    system_instruction = _build_system_instruction(config)

    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_instruction,
    )

    # Konusma gecmisini DB'den al (son 20 mesaj)
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(20)
    )
    history_rows = list(reversed(result.scalars().all()))

    # Gemini formati
    chat_messages = []
    for msg in history_rows:
        role = "user" if msg.direction == "inbound" else "model"
        body = msg.content.get("body", "") if isinstance(msg.content, dict) else str(msg.content)
        if body:
            chat_messages.append({"role": role, "parts": [body]})

    try:
        chat = model.start_chat(history=chat_messages)
        response = chat.send_message(
            user_message,
            generation_config=genai.types.GenerationConfig(
                temperature=config.temperature,
                max_output_tokens=config.max_tokens,
            ),
        )
        return _normalize_ai_response(response.text)
    except Exception as e:
        logger.error(f"Gemini AI hatasi: {e}")
        return "Su an teknik bir sorun yasiyoruz. Kisa sure icinde size donus yapacagiz."
