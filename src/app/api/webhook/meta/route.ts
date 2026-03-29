import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { sendTextMessage, markAsRead } from "@/lib/whatsapp"
import { getAIResponse } from "@/lib/gemini"
import { decryptToken } from "@/lib/crypto"

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "waapi_webhook_verify_2026"
const GRAPH_API = "https://graph.facebook.com/v21.0"

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

// POST — Gelen webhook'ları işle (WhatsApp + Instagram + Facebook)
export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const object = payload.object

    if (object === "whatsapp_business_account") {
      await handleWhatsAppWebhook(payload)
    } else if (object === "instagram") {
      await handleInstagramWebhook(payload)
    } else if (object === "page") {
      await handleFacebookWebhook(payload)
    }

    return NextResponse.json({ status: "ok" })
  } catch (e) {
    console.error("Webhook error:", e)
    return NextResponse.json({ status: "ok" })
  }
}

// ============================================
// WHATSAPP WEBHOOK (mevcut — değişiklik yok)
// ============================================
async function handleWhatsAppWebhook(payload: any) {
  const supabase = getServiceSupabase()

  for (const entry of payload.entry || []) {
    const wabaIdStr = entry.id
    if (!wabaIdStr) continue

    const { data: waba } = await supabase
      .from("waba_accounts")
      .select("*")
      .eq("waba_id", wabaIdStr)
      .single()

    if (!waba) continue

    // Access token'ı decrypt et
    let accessToken: string
    try {
      accessToken = decryptToken(waba.access_token)
    } catch {
      // Decrypt başarısızsa, token düz metin olabilir
      accessToken = waba.access_token
    }

    for (const change of entry.changes || []) {
      const value = change.value || {}
      const phoneNumberId = value.metadata?.phone_number_id
      if (!phoneNumberId) continue

      const { data: phone } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("phone_number_id", phoneNumberId)
        .eq("org_id", waba.org_id)
        .single()

      if (!phone) continue

      const contactsData = value.contacts || []

      for (const msg of value.messages || []) {
        await processWhatsAppMessage(supabase, waba, phone, accessToken, msg, contactsData)
      }

      for (const statusUpdate of value.statuses || []) {
        await processStatusUpdate(supabase, waba.org_id, statusUpdate)
      }
    }
  }
}

// ============================================
// INSTAGRAM WEBHOOK
// ============================================
async function handleInstagramWebhook(payload: any) {
  const supabase = getServiceSupabase()

  for (const entry of payload.entry || []) {
    const igAccountId = entry.id
    if (!igAccountId) continue

    // Önce channel_accounts tablosundan bul
    let channelAccount = await findChannelAccount(supabase, "instagram", igAccountId)
    let orgId: string
    let accessToken: string
    let accountId: string
    let channelAccountId: string | null = null

    if (channelAccount) {
      orgId = channelAccount.org_id
      accessToken = channelAccount.access_token
      accountId = channelAccount.account_id
      channelAccountId = channelAccount.id
    } else {
      // Fallback: eski yöntem ile org bul (henüz migrate edilmemiş org'lar için)
      const org = await findOrgByChannelId(supabase, "instagram_account_id", igAccountId)
      if (!org) continue
      orgId = org.id
      accessToken = org.settings?.instagram_page_token
      accountId = org.settings?.instagram_account_id
    }

    for (const messaging of entry.messaging || []) {
      const senderId = messaging.sender?.id
      const messageData = messaging.message
      if (!senderId || !messageData || senderId === igAccountId) continue

      const text = messageData.text || messageData.attachments?.[0]?.type || "[medya]"
      const msgId = messageData.mid || `ig_${Date.now()}`

      // Deduplikasyon
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("wa_message_id", msgId)
        .single()
      if (existing) continue

      // Gönderen bilgisi al
      const senderName = await getInstagramUsername(accessToken, senderId)

      // Contact bul/oluştur
      const contact = await getOrCreateContact(supabase, orgId, `ig_${senderId}`, senderName, "instagram")

      // Conversation bul/oluştur
      const conversation = await getOrCreateConversation(supabase, orgId, contact.id, null, "instagram", channelAccountId)

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

      // Bot aktifse yanıt
      if (conversation.is_bot_active) {
        const aiResponse = await getAIResponse(orgId, conversation.id, text)
        const cleanResponse = aiResponse.replace("[TRANSFER_SALES]", "").replace("[NOT_INTERESTED]", "").trim()

        // Instagram ile yanıt gönder
        const replyMsgId = await sendInstagramReply({ access_token: accessToken, account_id: accountId }, senderId, cleanResponse)

        await supabase.from("messages").insert({
          org_id: orgId,
          conversation_id: conversation.id,
          contact_id: contact.id,
          wa_message_id: replyMsgId,
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
        if (aiResponse.includes("[TRANSFER_SALES]")) { convUpdate.status = "open"; convUpdate.is_bot_active = false }
        if (aiResponse.includes("[NOT_INTERESTED]")) { convUpdate.status = "resolved"; convUpdate.is_bot_active = false }

        await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
      }
    }
  }
}

// ============================================
// FACEBOOK MESSENGER WEBHOOK
// ============================================
async function handleFacebookWebhook(payload: any) {
  const supabase = getServiceSupabase()

  for (const entry of payload.entry || []) {
    const pageId = entry.id
    if (!pageId) continue

    // Önce channel_accounts tablosundan bul (facebook uses page_id)
    let channelAccount = await findChannelAccountByPageId(supabase, "facebook", pageId)
    let orgId: string
    let accessToken: string
    let fbPageId: string
    let channelAccountId: string | null = null

    if (channelAccount) {
      orgId = channelAccount.org_id
      accessToken = channelAccount.access_token
      fbPageId = channelAccount.page_id || channelAccount.account_id
      channelAccountId = channelAccount.id
    } else {
      // Fallback: eski yöntem ile org bul (henüz migrate edilmemiş org'lar için)
      const org = await findOrgByChannelId(supabase, "facebook_page_id", pageId)
      if (!org) continue
      orgId = org.id
      accessToken = org.settings?.facebook_page_token
      fbPageId = org.settings?.facebook_page_id
    }

    for (const messaging of entry.messaging || []) {
      const senderId = messaging.sender?.id
      const messageData = messaging.message
      if (!senderId || !messageData || senderId === pageId) continue

      const text = messageData.text || messageData.attachments?.[0]?.type || "[medya]"
      const msgId = messageData.mid || `fb_${Date.now()}`

      // Deduplikasyon
      const { data: existing } = await supabase
        .from("messages")
        .select("id")
        .eq("wa_message_id", msgId)
        .single()
      if (existing) continue

      // Gönderen bilgisi al
      const senderName = await getFacebookUsername(accessToken, senderId)

      // Contact bul/oluştur
      const contact = await getOrCreateContact(supabase, orgId, `fb_${senderId}`, senderName, "facebook")

      // Conversation bul/oluştur
      const conversation = await getOrCreateConversation(supabase, orgId, contact.id, null, "facebook", channelAccountId)

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

      // Bot aktifse yanıt
      if (conversation.is_bot_active) {
        const aiResponse = await getAIResponse(orgId, conversation.id, text)
        const cleanResponse = aiResponse.replace("[TRANSFER_SALES]", "").replace("[NOT_INTERESTED]", "").trim()

        // Facebook Messenger ile yanıt gönder
        const replyMsgId = await sendFacebookReply({ access_token: accessToken, page_id: fbPageId }, senderId, cleanResponse)

        await supabase.from("messages").insert({
          org_id: orgId,
          conversation_id: conversation.id,
          contact_id: contact.id,
          wa_message_id: replyMsgId,
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
        if (aiResponse.includes("[TRANSFER_SALES]")) { convUpdate.status = "open"; convUpdate.is_bot_active = false }
        if (aiResponse.includes("[NOT_INTERESTED]")) { convUpdate.status = "resolved"; convUpdate.is_bot_active = false }

        await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
      }
    }
  }
}

// ============================================
// HELPER: channel_accounts tablosundan hesap bul
// ============================================
async function findChannelAccount(supabase: any, channel: string, accountId: string) {
  const { data } = await supabase
    .from("channel_accounts")
    .select("*")
    .eq("channel", channel)
    .eq("account_id", accountId)
    .eq("is_active", true)
    .maybeSingle()
  return data
}

// Facebook webhook'lar page_id ile gelir, account_id veya page_id olabilir
async function findChannelAccountByPageId(supabase: any, channel: string, pageId: string) {
  // Önce page_id ile dene
  const { data: byPageId } = await supabase
    .from("channel_accounts")
    .select("*")
    .eq("channel", channel)
    .eq("page_id", pageId)
    .eq("is_active", true)
    .maybeSingle()
  if (byPageId) return byPageId

  // Fallback: account_id ile dene
  const { data: byAccountId } = await supabase
    .from("channel_accounts")
    .select("*")
    .eq("channel", channel)
    .eq("account_id", pageId)
    .eq("is_active", true)
    .maybeSingle()
  return byAccountId
}

// ============================================
// HELPER (eski): Org bul (settings'ten channel ID ile) — backward compat
// ============================================
async function findOrgByChannelId(supabase: any, settingsKey: string, channelId: string) {
  const { data: orgs } = await supabase
    .from("organizations")
    .select("*")
    .eq("is_active", true)

  if (!orgs) return null

  for (const org of orgs) {
    if (org.settings?.[settingsKey] === channelId) return org
  }
  return null
}

// ============================================
// HELPER: Instagram kullanıcı adı al
// ============================================
async function getInstagramUsername(accessToken: string, igUserId: string): Promise<string> {
  try {
    if (!accessToken) return ""
    const res = await fetch(`${GRAPH_API}/${igUserId}?fields=name,username&access_token=${accessToken}`)
    const data = await res.json()
    return data.username || data.name || ""
  } catch { return "" }
}

// ============================================
// HELPER: Facebook kullanıcı adı al
// ============================================
async function getFacebookUsername(accessToken: string, fbUserId: string): Promise<string> {
  try {
    if (!accessToken) return ""
    const res = await fetch(`${GRAPH_API}/${fbUserId}?fields=name&access_token=${accessToken}`)
    const data = await res.json()
    return data.name || ""
  } catch { return "" }
}

// ============================================
// HELPER: Instagram'a yanıt gönder
// ============================================
async function sendInstagramReply(channelAccount: any, recipientId: string, text: string): Promise<string | null> {
  try {
    const token = channelAccount.access_token
    const igAccountId = channelAccount.account_id
    if (!token || !igAccountId) return null

    const res = await fetch(`${GRAPH_API}/${igAccountId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    })
    const data = await res.json()
    return data.message_id || `ig_reply_${Date.now()}`
  } catch { return null }
}

// ============================================
// HELPER: Facebook Messenger'a yanıt gönder
// ============================================
async function sendFacebookReply(channelAccount: any, recipientId: string, text: string): Promise<string | null> {
  try {
    const token = channelAccount.access_token
    const pageId = channelAccount.page_id
    if (!token || !pageId) return null

    const res = await fetch(`${GRAPH_API}/${pageId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: "RESPONSE",
      }),
    })
    const data = await res.json()
    return data.message_id || `fb_reply_${Date.now()}`
  } catch { return null }
}

// ============================================
// WHATSAPP: Gelen mesaj işle (mevcut mantık)
// ============================================
async function processWhatsAppMessage(
  supabase: any, waba: any, phone: any, accessToken: string, msg: any, contactsData: any[]
) {
  const msgId = msg.id || ""
  const senderWaId = msg.from || ""
  const msgType = msg.type || ""

  const { data: existing } = await supabase
    .from("messages").select("id").eq("wa_message_id", msgId).single()
  if (existing) return

  const text = extractText(msg, msgType)
  if (text === null) return

  const senderName = contactsData[0]?.profile?.name || ""
  const contact = await getOrCreateContact(supabase, waba.org_id, senderWaId, senderName, "whatsapp")
  if (!contact) {
    console.error("[Webhook] Contact olusturulamadi:", senderWaId)
    return
  }
  const conversation = await getOrCreateConversation(supabase, waba.org_id, contact.id, phone.id, "whatsapp")
  if (!conversation) {
    console.error("[Webhook] Conversation olusturulamadi:", contact.id)
    return
  }

  const validTypes = ["text", "image", "video", "audio", "document", "location"]
  const { error: msgError } = await supabase.from("messages").insert({
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
  if (msgError) {
    console.error("[Webhook] Mesaj kayit hatasi:", msgError)
    return
  }

  await supabase.from("conversations").update({
    last_message_at: new Date().toISOString(),
    last_message_preview: text.slice(0, 200),
    unread_count: (conversation.unread_count || 0) + 1,
  }).eq("id", conversation.id)

  await markAsRead(phone.phone_number_id, accessToken, msgId)

  if (conversation.is_bot_active) {
    const aiResponse = await getAIResponse(waba.org_id, conversation.id, text)
    const transferToSales = aiResponse.includes("[TRANSFER_SALES]")
    const notInterested = aiResponse.includes("[NOT_INTERESTED]")
    const cleanResponse = aiResponse.replace("[TRANSFER_SALES]", "").replace("[NOT_INTERESTED]", "").trim()

    const result = await sendTextMessage(phone.phone_number_id, accessToken, senderWaId, cleanResponse)
    const waMessageId = result.success ? result.messages?.[0]?.id || null : null

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
    if (transferToSales) { convUpdate.status = "open"; convUpdate.is_bot_active = false }
    if (notInterested) { convUpdate.status = "resolved"; convUpdate.is_bot_active = false }

    await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
  }
}

// ============================================
// Status update (WhatsApp — delivered/read/failed)
// ============================================
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
      await supabase.from("conversations").update({ unread_count: 0 }).eq("id", msg.conversation_id)
    }
  }
}

// ============================================
// Text çıkarıcı (WhatsApp mesaj tipleri)
// ============================================
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

// ============================================
// Contact bul/oluştur (tüm kanallar için)
// ============================================
async function getOrCreateContact(
  supabase: any, orgId: string, waId: string, name: string, channel: string = "whatsapp"
) {
  const { data: existing } = await supabase
    .from("contacts")
    .select("*")
    .eq("org_id", orgId)
    .eq("wa_id", waId)
    .single()

  if (existing) {
    const updates: any = { last_message_at: new Date().toISOString() }
    if (name && !existing.name) { updates.name = name; updates.profile_name = name }
    await supabase.from("contacts").update(updates).eq("id", existing.id)
    return existing
  }

  const phone = channel === "whatsapp" ? `+${waId}` : null

  const { data: newContact } = await supabase
    .from("contacts")
    .insert({
      org_id: orgId,
      wa_id: waId,
      phone: phone || waId,
      name: name || null,
      profile_name: name || null,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single()

  return newContact
}

// ============================================
// Conversation bul/oluştur (kanal bilgisiyle)
// ============================================
async function getOrCreateConversation(
  supabase: any, orgId: string, contactId: string, phoneNumberId: string | null,
  channel: string = "whatsapp", channelAccountId: string | null = null
) {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("org_id", orgId)
    .eq("contact_id", contactId)
    .in("status", ["open", "assigned"])
    .single()

  if (existing) return existing

  const insert: any = {
    org_id: orgId,
    contact_id: contactId,
    status: "open",
    is_bot_active: true,
    metadata: { channel },
  }
  if (phoneNumberId) insert.phone_number_id = phoneNumberId
  if (channelAccountId) insert.channel_account_id = channelAccountId

  const { data: newConv } = await supabase
    .from("conversations")
    .insert(insert)
    .select()
    .single()

  return newConv
}
