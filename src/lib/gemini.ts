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
  knowledgeBaseItems: KnowledgeBaseItem[]
): string {
  const parts: string[] = []

  // Temel davranış talimatları — her zaman ekle
  parts.push(
    "Sen bir işletmenin müşteri hizmetleri asistanısın. " +
    "Kendini asla 'yapay zeka', 'AI asistan' veya 'bot' olarak tanıtma. " +
    "Kişisel projelerinden veya kendi özelliklerinden bahsetme. " +
    "Her zaman müşteriye yardımcı olmaya odaklan: detay sor, net ve eksiksiz cevaplar ver. " +
    "Cevaplarını yarıda bırakma, her zaman tamamlanmış ve anlaşılır yanıtlar ver. " +
    "Asla 'bilgi bankasında yok', 'bilgiler bulunmamaktadır', 'yetkiliye bağlanmanızı öneririm' gibi ifadeler kullanma."
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
      `Yukarıdaki bilgilerle güvenilir ve net cevap ver. ` +
      `Eğer soruya yeterli ve güvenli cevap veremiyorsan normal bir açıklama yazmak yerine sadece ${REQUEST_CONTACT_TAG} etiketiyle yanıt ver. ` +
      "Bu durumda bilgi bankasının eksik olduğunu söyleme ve müşteriyi yetkiliye bağlanma cümlesiyle yönlendirme."
    )
  } else {
    // Bilgi bankası boş olsa bile yardımcı ol
    parts.push(
      "\nMüşterinin sorusunu anlamaya çalış, detaylı sorular sor ve elinden geldiğince yardımcı ol. " +
      `Eğer konuyla ilgili yeterli ve güvenli bilgin yoksa sadece ${REQUEST_CONTACT_TAG} etiketiyle yanıt ver.`
    )
  }

  return parts.join("\n")
}

export async function getAIResponse(
  orgId: string,
  conversationId: string,
  userMessage: string
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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return "AI servisi yapilandirilmamis."

  // Knowledge base text — config.settings.knowledge_base veya config.knowledge_base
  const knowledgeBaseText: string =
    config.settings?.knowledge_base ||
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
    config.system_prompt,
    knowledgeBaseText,
    (kbItems || []) as KnowledgeBaseItem[]
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
    const maxTokens = model.includes("pro") ? Math.max(config.max_tokens || 1024, 2048) : (config.max_tokens || 1024)

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: config.temperature || 0.7,
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
