/**
 * Gemini AI service — chatbot yanıt üretimi
 */

import { getServiceSupabase } from "./supabase"

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
    const maxTokens = model.includes("pro") ? Math.max(config.max_tokens || 300, 2048) : (config.max_tokens || 300)

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: config.system_prompt }] },
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: maxTokens,
        },
      }),
    })

    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      "Yanit uretilemedi."
  } catch (e) {
    console.error("Gemini AI hatasi:", e)
    return "Su an teknik bir sorun yasiyoruz. Kisa sure icinde size donus yapacagiz."
  }
}
