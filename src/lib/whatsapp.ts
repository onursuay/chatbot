/**
 * WhatsApp Cloud API helpers — Meta Graph API ile mesaj gönderimi
 */

const GRAPH_API_VERSION = "v21.0"
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export async function sendTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<{ messages: { id: string }[] } | null> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`
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
    if (!data.messages) {
      console.error("[WhatsApp API] Send failed:", JSON.stringify(data))
    }
    return data.messages ? data : null
  } catch (err) {
    console.error("[WhatsApp API] Network error:", err)
    return null
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
