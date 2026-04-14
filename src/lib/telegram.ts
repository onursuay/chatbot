/**
 * Telegram Bot API helpers
 * Resmi Telegram Bot API üzerinden mesaj gönderimi
 */

const TELEGRAM_API_BASE = "https://api.telegram.org/bot"

export interface TelegramSendResult {
  success: boolean
  message_id?: number
  error?: string
}

/**
 * Telegram üzerinden metin mesajı gönder
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string
): Promise<TelegramSendResult> {
  const url = `${TELEGRAM_API_BASE}${botToken}/sendMessage`
  console.log("[Telegram API] Sending:", { chatId, textLength: text.length })
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    })
    const data = await res.json()
    if (data.ok) {
      console.log("[Telegram API] Sent OK:", data.result?.message_id)
      return { success: true, message_id: data.result?.message_id }
    }
    console.error("[Telegram API] Send failed:", data.description)
    return { success: false, error: data.description || "Unknown error" }
  } catch (err: any) {
    console.error("[Telegram API] Network error:", err)
    return { success: false, error: err.message || "Network error" }
  }
}

/**
 * Bot'un Telegram webhook'unu kaydet
 * secretToken → X-Telegram-Bot-Api-Secret-Token header olarak gelir (org_id kullanıyoruz)
 */
export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string
): Promise<{ ok: boolean; description?: string }> {
  const url = `${TELEGRAM_API_BASE}${botToken}/setWebhook`
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secretToken,
        allowed_updates: ["message"],
      }),
    })
    const data = await res.json()
    console.log("[Telegram API] setWebhook:", data)
    return { ok: data.ok === true, description: data.description }
  } catch (err: any) {
    return { ok: false, description: err.message }
  }
}

/**
 * Bot bilgilerini al (getMe)
 */
export async function getTelegramBotInfo(
  botToken: string
): Promise<{ id: number; username: string; first_name: string } | null> {
  const url = `${TELEGRAM_API_BASE}${botToken}/getMe`
  try {
    const res = await fetch(url)
    const data = await res.json()
    if (data.ok) return data.result
    return null
  } catch {
    return null
  }
}
