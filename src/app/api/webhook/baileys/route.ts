import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAIResponse } from "@/lib/gemini"

// ============================================
// FORCE DYNAMIC — Vercel'de statik cache'e alınmasını önle
// ============================================
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const fetchCache = "force-no-store"

const BOT_ENABLED: boolean = false // Baileys bot yanıtlarını aç/kapat

// Baileys servisine mesaj göndermek için kullanılan endpoint
// Baileys servisi bu URL'i BAILEYS_SERVICE_URL env ile alır
async function sendViaBaileyService(
  serviceUrl: string,
  secret: string,
  to: string,
  text: string
): Promise<boolean> {
  try {
    const res = await fetch(`${serviceUrl}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-baileys-secret": secret,
      },
      body: JSON.stringify({ to, text }),
    })
    return res.ok
  } catch (err) {
    console.error("[BAILEYS][SEND] Hata:", err)
    return false
  }
}

// ============================================
// GET — Health check
// ============================================
export async function GET() {
  return NextResponse.json({ status: "ok", channel: "whatsapp_personal" })
}

// ============================================
// POST — Baileys servisinden gelen mesajları işle
//
// Baileys servisi bu endpoint'e şunu gönderir:
// {
//   org_id: string,
//   from: string,          // WhatsApp numarası (5301234567@s.whatsapp.net)
//   message_id: string,    // Benzersiz mesaj ID
//   text: string,          // Mesaj içeriği
//   sender_name: string,   // Gönderen adı (pushName)
//   timestamp: number,     // Unix timestamp
// }
// Header: x-baileys-secret = BAILEYS_WEBHOOK_SECRET
// ============================================
export async function POST(request: Request) {
  const arrivalTime = Date.now()

  // Güvenlik: shared secret doğrulama
  const incomingSecret = request.headers.get("x-baileys-secret")
  const expectedSecret = process.env.BAILEYS_WEBHOOK_SECRET

  if (!expectedSecret || incomingSecret !== expectedSecret) {
    console.warn("[BAILEYS][WEBHOOK] Geçersiz secret — istek reddedildi")
    return NextResponse.json({ status: "ok" }) // 200 döndür, ama işleme
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    console.error("[BAILEYS][WEBHOOK] JSON parse hatası")
    return NextResponse.json({ status: "ok" })
  }

  const { org_id, from, message_id, text, sender_name, timestamp } = payload

  console.log("[BAILEYS][WEBHOOK] >>>", {
    org_id,
    from: from?.slice(0, 20),
    message_id,
    textLength: text?.length,
    processingMs: 0,
  })

  if (!org_id || !from || !message_id || !text) {
    console.warn("[BAILEYS][WEBHOOK] Eksik alan:", { org_id: !!org_id, from: !!from, message_id: !!message_id, text: !!text })
    return NextResponse.json({ status: "ok" })
  }

  try {
    await handleBaileysMessage({ org_id, from, message_id, text, sender_name, timestamp })
  } catch (err) {
    console.error("[BAILEYS][WEBHOOK] Hata:", err)
  }

  console.log("[BAILEYS][WEBHOOK] ✓ done in", Date.now() - arrivalTime, "ms")
  return NextResponse.json({ status: "ok" })
}

// ============================================
// Baileys mesajını işle
// ============================================
async function handleBaileysMessage(params: {
  org_id: string
  from: string           // örn: 905301234567@s.whatsapp.net
  message_id: string
  text: string
  sender_name?: string
  timestamp?: number
}) {
  const supabase = getServiceSupabase()
  const { org_id: orgId, from, message_id, text, sender_name } = params

  // Bu org'un Baileys channel_account'ını bul
  const { data: channelAccount } = await supabase
    .from("channel_accounts")
    .select("id, metadata")
    .eq("org_id", orgId)
    .eq("channel", "whatsapp_personal")
    .eq("is_active", true)
    .maybeSingle()

  if (!channelAccount) {
    console.error("[BAILEYS] channel_account bulunamadı, org_id:", orgId)
    return
  }

  // WhatsApp numarasını normalize et: 905301234567@s.whatsapp.net → 905301234567
  const waId = from.replace("@s.whatsapp.net", "").replace(/\D/g, "")
  const msgId = `baileys_${message_id}`
  const senderName = sender_name || waId

  console.log("[BAILEYS] Gelen mesaj:", { waId, senderName, textLength: text.length })

  // Deduplikasyon
  const { data: existing } = await supabase
    .from("messages")
    .select("id")
    .eq("wa_message_id", msgId)
    .maybeSingle()

  if (existing) {
    console.log("[BAILEYS] Duplicate mesaj, atlanıyor:", msgId)
    return
  }

  // Contact bul/oluştur
  const contact = await getOrCreateBaileysContact(supabase, orgId, waId, senderName)
  if (!contact) {
    console.error("[BAILEYS] Contact oluşturulamadı")
    return
  }

  // Conversation bul/oluştur
  const conversation = await getOrCreateBaileysConversation(supabase, orgId, contact.id, channelAccount.id)
  if (!conversation) {
    console.error("[BAILEYS] Conversation oluşturulamadı")
    return
  }

  // Mesajı kaydet
  await supabase.from("messages").insert({
    org_id: orgId,
    conversation_id: conversation.id,
    contact_id: contact.id,
    wa_message_id: msgId,
    direction: "inbound",
    type: "text",
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

  console.log("[BAILEYS] Mesaj kaydedildi | conv:", conversation.id)

  // Bot aktifse AI yanıtı üret ve gönder
  if (BOT_ENABLED && conversation.is_bot_active) {
    const serviceUrl = process.env.BAILEYS_SERVICE_URL
    const secret = process.env.BAILEYS_WEBHOOK_SECRET

    if (!serviceUrl || !secret) {
      console.warn("[BAILEYS] BAILEYS_SERVICE_URL veya BAILEYS_WEBHOOK_SECRET eksik")
      return
    }

    try {
      const aiResponse = await getAIResponse(orgId, conversation.id, text, contact.name || undefined)
      const cleanResponse = aiResponse
        .replace("[REQUEST_CONTACT]", "")
        .replace("[TRANSFER_SALES]", "")
        .replace("[NOT_INTERESTED]", "")
        .trim()

      // Baileys servisine gönder — to: 905301234567@s.whatsapp.net formatında
      const toNumber = from.includes("@") ? from : `${waId}@s.whatsapp.net`
      const sent = await sendViaBaileyService(serviceUrl, secret, toNumber, cleanResponse)

      await supabase.from("messages").insert({
        org_id: orgId,
        conversation_id: conversation.id,
        contact_id: contact.id,
        wa_message_id: null,
        direction: "outbound",
        type: "text",
        content: { body: cleanResponse },
        status: sent ? "sent" : "failed",
        sender_type: "bot",
      })

      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: cleanResponse.slice(0, 200),
        })
        .eq("id", conversation.id)

      console.log("[BAILEYS] Bot yanıtı gönderildi:", sent)
    } catch (err) {
      console.error("[BAILEYS] AI yanıtı hatası:", err)
    }
  }
}

// ============================================
// Contact bul / oluştur (Baileys — WhatsApp Personal için)
// wa_id = telefon numarası (905301234567)
// ============================================
async function getOrCreateBaileysContact(
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
    .maybeSingle()

  if (existing) {
    const updates: any = { last_message_at: new Date().toISOString() }
    if (name && !existing.name) { updates.name = name; updates.profile_name = name }
    await supabase.from("contacts").update(updates).eq("id", existing.id)
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

// ============================================
// Conversation bul / oluştur (Baileys için)
// channel = "whatsapp_personal"
// ============================================
async function getOrCreateBaileysConversation(
  supabase: any,
  orgId: string,
  contactId: string,
  channelAccountId: string
) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("org_id", orgId)
    .eq("contact_id", contactId)
    .eq("channel_account_id", channelAccountId)
    .in("status", ["open", "assigned"])
    .maybeSingle()

  if (existing) return existing

  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({
      org_id: orgId,
      contact_id: contactId,
      channel_account_id: channelAccountId,
      channel: "whatsapp_personal",
      status: "open",
      is_bot_active: true,
      metadata: { channel: "whatsapp_personal" },
    })
    .select()
    .single()

  if (error) {
    console.error("[BAILEYS] Conversation oluşturma hatası:", error.message)
    const { data: retry } = await supabase
      .from("conversations")
      .select("*")
      .eq("org_id", orgId)
      .eq("contact_id", contactId)
      .eq("channel_account_id", channelAccountId)
      .in("status", ["open", "assigned"])
      .maybeSingle()
    return retry
  }

  return newConv
}
