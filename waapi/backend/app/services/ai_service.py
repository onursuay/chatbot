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
DEFAULT_CHATBOT_MAX_TOKENS = 1024
DEFAULT_CHATBOT_SYSTEM_PROMPT = (
    "Sen Ceylin'sin. Bir isletmenin musteri temsilcisi gibi dogal, sicak ve profesyonel konusursun. "
    "Kendini asla yapay zeka, AI asistan veya bot olarak tanitmazsin."
)
DEFAULT_PROFANITY_WARNING_MESSAGE = (
    "Size yardimci olmak isterim ancak lutfen kufur veya kirici ifade kullanmadan devam edelim."
)
DEFAULT_PROFANITY_CLOSE_MESSAGE = (
    "Bu sekilde devam edemem. Gorusmeyi burada sonlandiriyorum, iyi gunler dilerim."
)
DEFAULT_PROFANITY_CLOSE_THRESHOLD = 2
DEFAULT_PROFANITY_WORDS = [
    "amk",
    "aq",
    "amina koy",
    "amina koyayim",
    "amina koyim",
    "amina",
    "amcik",
    "amcuk",
    "anani sikeyim",
    "anasini sikeyim",
    "ananin ami",
    "ana baci",
    "orospu",
    "orosbu",
    "orospu cocugu",
    "orospu evladi",
    "pic",
    "pic kurusu",
    "siktir",
    "sikerim",
    "sikeyim",
    "sikik",
    "sikicem",
    "sikmis",
    "sikme",
    "yarak",
    "yarrak",
    "got",
    "gotveren",
    "gotlek",
    "gavat",
    "ibne",
    "kahpe",
    "pust",
    "pezevenk",
    "dalyarak",
    "fuck",
    "fucking",
    "shit",
    "bitch",
    "asshole",
    "motherfucker",
    "bastard",
    "dick",
    "cunt",
]
LEGACY_CHATBOT_SYSTEM_PROMPTS = {
    "Sen bir WhatsApp asistanisin. Musterilere yardimci ol, kibar ve profesyonel ol. Kisa ve oz yanitlar ver.",
    "Sen bir WhatsApp müşteri asistanısın. Müşterilere yardımcı ol, kibar ve profesyonel ol.",
    "Sen bir WhatsApp musteri asistansın. Musterilere yardimci ol, kibar ve profesyonel ol.",
}
LEGACY_CHATBOT_NAMES = {"Default Bot", "AI Asistan"}


def build_default_chatbot_settings(settings: dict | None = None) -> dict:
    current = settings.copy() if isinstance(settings, dict) else {}
    profanity_words = current.get("profanity_words")
    if not isinstance(profanity_words, list) or not profanity_words:
        profanity_words = DEFAULT_PROFANITY_WORDS

    return {
        **current,
        "profanity_words": [str(word).strip() for word in profanity_words if str(word).strip()],
        "profanity_warning_message": (
            current.get("profanity_warning_message", "").strip()
            if isinstance(current.get("profanity_warning_message"), str) and current.get("profanity_warning_message", "").strip()
            else DEFAULT_PROFANITY_WARNING_MESSAGE
        ),
        "profanity_close_message": (
            current.get("profanity_close_message", "").strip()
            if isinstance(current.get("profanity_close_message"), str) and current.get("profanity_close_message", "").strip()
            else DEFAULT_PROFANITY_CLOSE_MESSAGE
        ),
        "profanity_close_threshold": (
            int(current.get("profanity_close_threshold"))
            if isinstance(current.get("profanity_close_threshold"), (int, float)) and int(current.get("profanity_close_threshold")) >= 2
            else DEFAULT_PROFANITY_CLOSE_THRESHOLD
        ),
    }


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
    settings = build_default_chatbot_settings(config.settings)

    parts.append(
        DEFAULT_CHATBOT_SYSTEM_PROMPT
        + " "
        + "Konusmanin akisina uyum sagla; her mesaja ayni kalipla baslama veya bitirme. "
        + "Ozellikle 'yardimci olabilecegim baska bir konu var mi' benzeri kaliplari gereksiz yere tekrar etme. "
        + "Soru netse dogrudan ve guven veren bir cevap ver. Eksik bilgi varsa sadece gercekten gerekli olan kisa bir soru sor. "
        + "Musteri tesekkur ederek veya onay vererek konuyu kapatiyorsa sicak ama kisa bir kapanis yap, konusmayi gereksiz yere uzatma. "
        + "Musteri yeni bilgi veriyor, kararsiz kaliyor veya surec devam ediyorsa bir sonraki mantikli adimi onererek konusmayi ilerlet. "
        + "Asla 'bilgi bankasinda yok', 'bilgiler bulunmamaktadir' veya 'yetkiliye baglayalim' gibi ifadeler kullanma."
    )

    if config.system_prompt:
        parts.append(config.system_prompt.strip())

    # Knowledge base (hizmetler, fiyatlar, SSS vs.)
    knowledge_base = ""
    if settings and isinstance(settings, dict):
        knowledge_base = settings.get("knowledge_base", "")

    if knowledge_base:
        parts.append(f"""

--- BILGI TABANI ---
Asagidaki bilgiler isletmenin sundugu hizmetler, urunler, fiyatlar ve sik sorulan sorulardir.
Musteri sorularini bu bilgilere dayanarak yanitla. Bilgileri ezber gibi kopyalama; konusmanin baglamina gore dogal bicimde uyarlayarak cevap ver.

{knowledge_base}
--- BILGI TABANI SONU ---
""")

    # Genel kurallar
    parts.append("""
KURALLAR:
- Kisa oldugunda kisa, detay gerektiginde aciklayici ol; tek tip kalipta yazma.
- Musteriyle WhatsApp'ta sohbet ediyorsun gibi yaz, resmi mektup gibi degil.
- Fiyat soruldugunda bilgi tabanindaki fiyatlari ver.
- Randevu/rezervasyon istenirse bilgi tabanindaki yonergeleri takip et.
- Musteri israrla gercek kisiyle konusmak isterse [TRANSFER_SALES] etiketini yanitinin sonuna ekle.
- Musteri ilgilenmedigini net belirtirse [NOT_INTERESTED] etiketini ekle.
- Eger soruya yeterli ve guvenli cevap veremiyorsan normal aciklama yazmak yerine sadece [REQUEST_CONTACT] etiketiyle yanit ver.
- Asla "bilgi bankasinda yok", "bilgiler bulunmamaktadir" veya "yetkiliye baglayalim" gibi ifadeler kullanma.
- Musteri tesekkur ederek kapatiyorsa yeni soru uretme; dogal bir kapanis yap.
- Ayni kelimeleri ve ayni yardim kaliplarini ust uste tekrar etme.
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

    normalized_settings = build_default_chatbot_settings(config.settings)
    should_backfill_settings = normalized_settings != (config.settings or {})
    normalized_system_prompt = (config.system_prompt or "").strip()
    should_backfill_system_prompt = (
        not normalized_system_prompt
        or normalized_system_prompt in LEGACY_CHATBOT_SYSTEM_PROMPTS
    )
    should_backfill_name = (config.name or "").strip() in LEGACY_CHATBOT_NAMES
    normalized_max_tokens = max(int(config.max_tokens or 0), DEFAULT_CHATBOT_MAX_TOKENS)
    should_backfill_max_tokens = normalized_max_tokens != config.max_tokens

    if should_backfill_settings:
        config.settings = normalized_settings
    if should_backfill_system_prompt:
        config.system_prompt = DEFAULT_CHATBOT_SYSTEM_PROMPT
    if should_backfill_name:
        config.name = "Ceylin"
    if should_backfill_max_tokens:
        config.max_tokens = normalized_max_tokens
    if (
        should_backfill_settings
        or should_backfill_system_prompt
        or should_backfill_name
        or should_backfill_max_tokens
    ):
        await db.flush()

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
                temperature=max(config.temperature or 0.7, 0.85),
                max_output_tokens=(
                    max(normalized_max_tokens, 2048)
                    if "pro" in (config.ai_model or settings.DEFAULT_AI_MODEL)
                    else normalized_max_tokens
                ),
                top_p=0.95,
            ),
        )
        return _normalize_ai_response(response.text)
    except Exception as e:
        logger.error(f"Gemini AI hatasi: {e}")
        return "Su an teknik bir sorun yasiyoruz. Kisa sure icinde size donus yapacagiz."
