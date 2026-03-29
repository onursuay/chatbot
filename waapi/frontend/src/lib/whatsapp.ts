/**
 * WhatsApp Cloud API helpers — Meta Graph API ile mesaj gönderimi
 */

const GRAPH_API_VERSION = "v21.0"
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export interface SendResult {
  success: boolean
  messages?: { id: string }[]
  error?: string
}

export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<SendResult> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`
  console.log("[WhatsApp API] Sending:", { phoneNumberId, to, textLength: text.length })
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text },
      }),
    })
    const data = await res.json()
    if (data.messages) {
      console.log("[WhatsApp API] Sent OK:", data.messages[0]?.id)
      return { success: true, messages: data.messages }
    }
    const errorMsg = data.error?.message || JSON.stringify(data)
    console.error("[WhatsApp API] Send failed:", errorMsg, "| Code:", data.error?.code, "| Status:", res.status)
    return { success: false, error: errorMsg }
  } catch (err: any) {
    console.error("[WhatsApp API] Network error:", err)
    return { success: false, error: err.message || "Network error" }
  }
}

export async function sendTemplateMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string = "tr",
  components?: any[]
): Promise<any> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`
  const template: any = { name: templateName, language: { code: languageCode } }
  if (components) template.components = components

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template,
    }),
  })
  const data = await res.json()
  return data.messages ? data : null
}

export async function markAsRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
): Promise<void> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    })
  } catch {
    // ignore
  }
}
