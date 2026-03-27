import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { sendTextMessage, markAsRead } from "@/lib/whatsapp"
import { getAIResponse } from "@/lib/gemini"

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "waapi_webhook_verify_2026"

// GET — Meta webhook doğrulama (challenge)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// POST — Gelen webhook'ları işle
export async function POST(request: Request) {
  try {
    const payload = await request.json()
    await routeWebhook(payload)
    return NextResponse.json({ status: "ok" })
  } catch (e) {
    console.error("Webhook error:", e)
    return NextResponse.json({ status: "ok" })
  }
}

async function routeWebhook(payload: any) {
  const supabase = getServiceSupabase()

  for (const entry of payload.entry || []) {
    const wabaIdStr = entry.id
    if (!wabaIdStr) continue

    // WABA ile tenant bul
    const { data: waba } = await supabase
      .from("waba_accounts")
      .select("*")
      .eq("waba_id", wabaIdStr)
      .single()

    if (!waba) {
      console.warn(`Bilinmeyen WABA: ${wabaIdStr}`)
      continue
    }

    for (const change of entry.changes || []) {
      const value = change.value || {}
      const phoneNumberId = value.metadata?.phone_number_id
      if (!phoneNumberId) continue

      // Phone number doğrula
      const { data: phone } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("phone_number_id", phoneNumberId)
        .eq("org_id", waba.org_id)
        .single()

      if (!phone) continue

      const contactsData = value.contacts || []

      // Gelen mesajları işle
      for (const msg of value.messages || []) {
        await processInboundMessage(supabase, waba, phone, msg, contactsData)
      }

      // Status update'leri işle
      for (const statusUpdate of value.statuses || []) {
        await processStatusUpdate(supabase, waba.org_id, statusUpdate)
      }
    }
  }
}

async function processInboundMessage(
  supabase: any,
  waba: any,
  phone: any,
  msg: any,
  contactsData: any[]
) {
  const msgId = msg.id || ""
  const senderWaId = msg.from || ""
  const msgType = msg.type || ""

  // Deduplikasyon
  const { data: existing } = await supabase
    .from("messages")
    .select("id")
    .eq("wa_message_id", msgId)
    .single()

  if (existing) return

  // Mesaj içeriğini çıkar
  const text = extractText(msg, msgType)
  if (text === null) return

  // Gönderenin profil bilgisi
  const senderName = contactsData[0]?.profile?.name || ""

  // Contact bul veya oluştur
  const contact = await getOrCreateContact(supabase, waba.org_id, senderWaId, senderName)

  // Conversation bul veya oluştur
  const conversation = await getOrCreateConversation(supabase, waba.org_id, contact.id, phone.id)

  // Mesajı DB'ye kaydet
  const validTypes = ["text", "image", "video", "audio", "document", "location"]
  await supabase.from("messages").insert({
    org_id: waba.org_id,
    conversation_id: conversation.id,
    contact_id: contact.id,
    wa_message_id: msgId,
    direction: "inbound",
    type: validTypes.includes(msgType) ? msgType : "text",
    content: { body: text },
    status: "received",
    sender_type: "contact",
  })

  // Conversation güncelle
  await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: text.slice(0, 200),
      unread_count: (conversation.unread_count || 0) + 1,
    })
    .eq("id", conversation.id)

  // Okundu bilgisi gönder
  await markAsRead(phone.phone_number_id, waba.access_token, msgId)

  // AI chatbot aktifse yanıt üret
  if (conversation.is_bot_active) {
    const aiResponse = await getAIResponse(waba.org_id, conversation.id, text)

    // Etiketleri temizle
    const transferToSales = aiResponse.includes("[TRANSFER_SALES]")
    const notInterested = aiResponse.includes("[NOT_INTERESTED]")
    const cleanResponse = aiResponse
      .replace("[TRANSFER_SALES]", "")
      .replace("[NOT_INTERESTED]", "")
      .trim()

    // Yanıtı gönder
    const result = await sendTextMessage(
      phone.phone_number_id,
      waba.access_token,
      senderWaId,
      cleanResponse
    )

    const waMessageId = result?.messages?.[0]?.id || null

    // Yanıtı DB'ye kaydet
    await supabase.from("messages").insert({
      org_id: waba.org_id,
      conversation_id: conversation.id,
      contact_id: contact.id,
      wa_message_id: waMessageId,
      direction: "outbound",
      type: "text",
      content: { body: cleanResponse },
      status: "sent",
      sender_type: "bot",
    })

    const convUpdate: any = {
      last_message_at: new Date().toISOString(),
      last_message_preview: cleanResponse.slice(0, 200),
    }

    if (transferToSales) {
      convUpdate.status = "open"
      convUpdate.is_bot_active = false
    }
    if (notInterested) {
      convUpdate.status = "resolved"
      convUpdate.is_bot_active = false
    }

    await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
  }
}

async function processStatusUpdate(supabase: any, orgId: string, statusUpdate: any) {
  const waMsgId = statusUpdate.id
  const newStatus = statusUpdate.status
  if (!waMsgId || !newStatus) return

  const { data: msg } = await supabase
    .from("messages")
    .select("id, conversation_id")
    .eq("wa_message_id", waMsgId)
    .eq("org_id", orgId)
    .single()

  if (msg) {
    await supabase.from("messages").update({ status: newStatus }).eq("id", msg.id)

    if (newStatus === "read") {
      await supabase
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", msg.conversation_id)
    }
  }
}

function extractText(msg: any, msgType: string): string | null {
  if (msgType === "text") return msg.text?.body || ""
  if (msgType === "button") return msg.button?.text || ""
  if (msgType === "interactive") {
    return msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || ""
  }
  if (["image", "video", "audio", "document"].includes(msgType)) {
    return msg[msgType]?.caption || "[medya]"
  }
  return null
}

async function getOrCreateContact(
  supabase: any,
  orgId: string,
  waId: string,
  name: string
) {
  const { data: existing } = await supabase
    .from("contacts")
    .select("*")
    .eq("org_id", orgId)
    .eq("wa_id", waId)
    .single()

  if (existing) {
    if (name && !existing.name) {
      await supabase
        .from("contacts")
        .update({ name, profile_name: name, last_message_at: new Date().toISOString() })
        .eq("id", existing.id)
    } else {
      await supabase
        .from("contacts")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", existing.id)
    }
    return existing
  }

  const { data: newContact } = await supabase
    .from("contacts")
    .insert({
      org_id: orgId,
      wa_id: waId,
      phone: `+${waId}`,
      name: name || null,
      profile_name: name || null,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single()

  return newContact
}

async function getOrCreateConversation(
  supabase: any,
  orgId: string,
  contactId: string,
  phoneNumberId: string
) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("org_id", orgId)
    .eq("contact_id", contactId)
    .in("status", ["open", "assigned"])
    .single()

  if (existing) return existing

  const { data: newConv } = await supabase
    .from("conversations")
    .insert({
      org_id: orgId,
      contact_id: contactId,
      phone_number_id: phoneNumberId,
      status: "open",
      is_bot_active: true,
    })
    .select()
    .single()

  return newConv
}
