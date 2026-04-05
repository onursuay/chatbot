/**
 * Gemini AI service — chatbot yanıt üretimi
 * Knowledge base + system prompt + konuşma geçmişi ile akıllı yanıt üretir.
 */

import { getServiceSupabase } from "./supabase"

interface KnowledgeBaseItem {
  id: string
  title: string
  content: string
  type: string
  category: string | null
}

const REQUEST_CONTACT_TAG = "[REQUEST_CONTACT]"
export const DEFAULT_CHATBOT_MAX_TOKENS = 1024
export const DEFAULT_CHATBOT_SYSTEM_PROMPT =
  "Sen Ceylin'sin. Bir işletmenin müşteri temsilcisi gibi doğal, sıcak ve profesyonel konuşursun. Kendini asla yapay zeka, AI asistan veya bot olarak tanıtmazsın."
export const DEFAULT_PROFANITY_WARNING_MESSAGE =
  "Size yardımcı olmak isterim ancak lütfen küfür veya kırıcı ifade kullanmadan devam edelim."
export const DEFAULT_PROFANITY_CLOSE_MESSAGE =
  "Bu şekilde devam edemem. Görüşmeyi burada sonlandırıyorum, iyi günler dilerim."
export const DEFAULT_PROFANITY_CLOSE_THRESHOLD = 2
export const DEFAULT_PROFANITY_WORDS = [
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
const LEGACY_CHATBOT_SYSTEM_PROMPTS = [
  "Sen bir WhatsApp asistanisin. Musterilere yardimci ol, kibar ve profesyonel ol. Kisa ve oz yanitlar ver.",
  "Sen bir WhatsApp müşteri asistanısın. Müşterilere yardımcı ol, kibar ve profesyonel ol.",
  "Sen bir WhatsApp musteri asistansın. Musterilere yardimci ol, kibar ve profesyonel ol.",
]
const LEGACY_CHATBOT_NAMES = ["Default Bot", "AI Asistan"]

export function buildDefaultChatbotSettings(settings?: Record<string, any> | null) {
  const current = settings && typeof settings === "object" ? settings : {}
  const profanityWords = Array.isArray(current.profanity_words) && current.profanity_words.length > 0
    ? current.profanity_words.map((word: unknown) => String(word).trim()).filter(Boolean)
    : DEFAULT_PROFANITY_WORDS

  const mergedSettings: Record<string, any> = {
    ...current,
    profanity_words: profanityWords,
    profanity_warning_message:
      typeof current.profanity_warning_message === "string" && current.profanity_warning_message.trim()
        ? current.profanity_warning_message.trim()
        : DEFAULT_PROFANITY_WARNING_MESSAGE,
    profanity_close_message:
      typeof current.profanity_close_message === "string" && current.profanity_close_message.trim()
        ? current.profanity_close_message.trim()
        : DEFAULT_PROFANITY_CLOSE_MESSAGE,
    profanity_close_threshold:
      typeof current.profanity_close_threshold === "number" && current.profanity_close_threshold >= 2
        ? current.profanity_close_threshold
        : DEFAULT_PROFANITY_CLOSE_THRESHOLD,
  }

  return mergedSettings
}

function normalizeAIResponse(text: string): string {
  const clean = text.trim()
  const lower = clean.toLocaleLowerCase("tr-TR")

  const fallbackPatterns = [
    "bilgi bankas",
    "bilgi taban",
    "bulunmamaktad",
    "bulunamadi",
    "yetkiliye baglan",
    "yetkiliye bağlan",
    "bir yetkiliye",
    "yardimci olabilecek bir yetkili",
    "yardımcı olabilecek bir yetkili",
  ]

  if (fallbackPatterns.some((pattern) => lower.includes(pattern))) {
    return REQUEST_CONTACT_TAG
  }

  return clean
}

/**
 * System prompt + knowledge base bilgilerini birleştirerek
 * kapsamlı bir system instruction oluşturur.
 */
function buildSystemInstruction(
  systemPrompt: string | null,
  knowledgeBaseText: string,
  knowledgeBaseItems: KnowledgeBaseItem[],
  contactName?: string
): string {
  const parts: string[] = []

  // Kullanıcı adı talimatı
  if (contactName && contactName.trim()) {
    parts.push(
      `Kullanıcının adı "${contactName.trim()}" olarak kayıtlıdır. ` +
      `İsimden cinsiyeti tahmin etmeye çalış ve Türkçe'ye uygun hitap et (örneğin erkek isimse "Bey", kadın isimse "Hanım"). ` +
      `Emin olamazsan sadece ismiyle hitap et, "Bey" veya "Hanım" ekleme. ` +
      `Eğer kullanıcı cinsiyetini yanlış tahmin ettiğini belirtirse ya da düzeltme yaparsa, ` +
      `"Özür dilerim efendim, yanlış hitap ettim. [Doğru hitap] olarak devam edeceğim." şeklinde kısa ve sıcak bir özür sun, ardından konuşmaya kaldığın yerden devam et.`
    )
  }

  // Temel davranış talimatları — her zaman ekle
  parts.push(
    DEFAULT_CHATBOT_SYSTEM_PROMPT + " " +
    "Kişisel projelerinden veya kendi özelliklerinden bahsetme. " +
    "Konuşmanın akışına uyum sağla; her mesaja aynı kalıpla başlama veya bitirme. " +
    "Özellikle 'yardımcı olabileceğim başka bir konu var mı' benzeri kalıpları gereksiz yere tekrar etme. " +
    "Soru netse doğrudan ve güven veren bir cevap ver. Eksik bilgi varsa sadece gerçekten gerekli olan kısa bir soru sor. " +
    "Müşteri teşekkür ederek veya onay vererek konuyu kapatıyorsa sıcak ama kısa bir kapanış yap, konuşmayı gereksiz yere uzatma. " +
    "Müşteri yeni bilgi veriyor, kararsız kalıyor veya süreç devam ediyorsa bir sonraki mantıklı adımı önererek konuşmayı ilerlet. " +
    "Cevaplarını yarıda bırakma; tamamlanmış, anlaşılır ve doğal yanıtlar ver. " +
    "Asla 'bilgi bankasında yok', 'bilgiler bulunmamaktadır' veya 'yetkiliye bağlanmanızı öneririm' gibi ifadeler kullanma."
  )

  // Ana system prompt
  if (systemPrompt) {
    parts.push(systemPrompt.trim())
  }

  // Knowledge base bölümü — yalnızca içerik varsa ekle
  const hasKbText = knowledgeBaseText.trim().length > 0
  const hasKbItems = knowledgeBaseItems.length > 0

  if (hasKbText || hasKbItems) {
    parts.push("\n--- BİLGİ BANKASI ---")

    if (hasKbText) {
      parts.push(knowledgeBaseText.trim())
    }

    for (const item of knowledgeBaseItems) {
      const label = item.category || item.type || ""
      parts.push(`\n## ${item.title} (${label})\n${item.content}`)
    }

    parts.push("\n--- BİLGİ BANKASI SONU ---")

    parts.push(
      "\nMüşteri sorularına yukarıdaki bilgi bankasına dayanarak doğru ve tutarlı yanıt ver.\n" +
      `Yukarıdaki bilgileri ezber gibi kopyalama; konuşmanın bağlamına göre doğal biçimde özetleyip uyarlayarak cevap ver. ` +
      `Eğer soruya yeterli ve güvenli cevap veremiyorsan normal bir açıklama yazmak yerine sadece ${REQUEST_CONTACT_TAG} etiketiyle yanıt ver. ` +
      "Bu durumda bilgi bankasının eksik olduğunu söyleme ve müşteriyi yetkiliye bağlanma cümlesiyle yönlendirme."
    )
  } else {
    // Bilgi bankası boş olsa bile yardımcı ol
    parts.push(
      "\nMüşterinin sorusunu anlamaya çalış, gerekiyorsa tek ve yerinde bir soru sor, elinden geldiğince doğal biçimde yardımcı ol. " +
      `Eğer konuyla ilgili yeterli ve güvenli bilgin yoksa sadece ${REQUEST_CONTACT_TAG} etiketiyle yanıt ver.`
    )
  }

  return parts.join("\n")
}

export async function getAIResponse(
  orgId: string,
  conversationId: string,
  userMessage: string,
  contactName?: string
): Promise<string> {
  const supabase = getServiceSupabase()

  // Chatbot config al
  const { data: config } = await supabase
    .from("chatbot_configs")
    .select("*")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .single()

  if (!config) return "Bot yapilandirmasi bulunamadi."

  const settings = buildDefaultChatbotSettings(config.settings)
  const normalizedSystemPrompt = typeof config.system_prompt === "string" ? config.system_prompt.trim() : ""
  const shouldBackfillSystemPrompt =
    !normalizedSystemPrompt || LEGACY_CHATBOT_SYSTEM_PROMPTS.includes(normalizedSystemPrompt)
  const shouldBackfillName =
    typeof config.name === "string" && LEGACY_CHATBOT_NAMES.includes(config.name.trim())
  const normalizedMaxTokens = Math.max(Number(config.max_tokens) || 0, DEFAULT_CHATBOT_MAX_TOKENS)
  const shouldBackfillMaxTokens = normalizedMaxTokens !== config.max_tokens
  const shouldBackfillSettings =
    !Array.isArray(config.settings?.profanity_words) ||
    !config.settings?.profanity_words?.length ||
    !config.settings?.profanity_warning_message ||
    !config.settings?.profanity_close_message ||
    !config.settings?.profanity_close_threshold

  if (shouldBackfillSettings || shouldBackfillSystemPrompt || shouldBackfillName || shouldBackfillMaxTokens) {
    const updatePayload: Record<string, any> = {}
    if (shouldBackfillSettings) updatePayload.settings = settings
    if (shouldBackfillSystemPrompt) updatePayload.system_prompt = DEFAULT_CHATBOT_SYSTEM_PROMPT
    if (shouldBackfillName) updatePayload.name = "Ceylin"
    if (shouldBackfillMaxTokens) updatePayload.max_tokens = normalizedMaxTokens

    await supabase
      .from("chatbot_configs")
      .update(updatePayload)
      .eq("id", config.id)
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return "AI servisi yapilandirilmamis."

  // Knowledge base text — config.settings.knowledge_base veya config.knowledge_base
  const knowledgeBaseText: string =
    settings.knowledge_base ||
    config.knowledge_base ||
    ""

  // Knowledge base items — veritabanından al
  const { data: kbItems } = await supabase
    .from("knowledge_base_items")
    .select("id, title, content, type, category")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true })

  // Kapsamlı system instruction oluştur
  const systemInstruction = buildSystemInstruction(
    shouldBackfillSystemPrompt ? DEFAULT_CHATBOT_SYSTEM_PROMPT : normalizedSystemPrompt,
    knowledgeBaseText,
    (kbItems || []) as KnowledgeBaseItem[],
    contactName
  )

  // Son 20 mesajı al
  const { data: messages } = await supabase
    .from("messages")
    .select("direction, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(20)

  const history = (messages || []).reverse()

  // Gemini API formatına çevir
  const contents = history.map((msg) => ({
    role: msg.direction === "inbound" ? "user" : "model",
    parts: [{ text: msg.content?.body || "" }],
  })).filter((c) => c.parts[0].text)

  // Yeni mesajı ekle
  contents.push({ role: "user", parts: [{ text: userMessage }] })

  try {
    const model = config.ai_model || "gemini-2.5-flash"
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

    // gemini-2.5-pro thinking token'ları ayrı harcanır, maxOutputTokens daha yüksek olmalı
    const maxTokens = model.includes("pro") ? Math.max(normalizedMaxTokens, 2048) : normalizedMaxTokens
    const effectiveTemperature = Math.max(Number(config.temperature) || 0.7, 0.85)

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: effectiveTemperature,
          topP: 0.95,
          maxOutputTokens: maxTokens,
        },
      }),
    })

    const data = await res.json()
    const responseText =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Yanit uretilemedi."
    return normalizeAIResponse(responseText)
  } catch (e) {
    console.error("Gemini AI hatasi:", e)
    return "Su an teknik bir sorun yasiyoruz. Kisa sure icinde size donus yapacagiz."
  }
}
