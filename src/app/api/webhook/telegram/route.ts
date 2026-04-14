import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { sendTelegramMessage } from "@/lib/telegram"
import { getAIResponse } from "@/lib/gemini"

// ============================================
// FORCE DYNAMIC — Vercel'de statik cache'e alınmasını önle
// ============================================
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const fetchCache = "force-no-store"

const BOT_ENABLED: boolean = false // Telegram bot yanıtlarını aç/kapat

// ============================================
// GET — Telegram webhook doğrulama (health check)
// ============================================
export async function GET() {
  return NextResponse.json({ status: "ok", channel: "telegram" })
}

// ============================================
// POST — Telegram'dan gelen mesajları işle
// ============================================
export async function POST(request: Request) {
  const arrivalTime = Date.now()

  // Güvenlik: X-Telegram-Bot-Api-Secret-Token = org_id
  // Botu kaydederken secret_token=org_id ile setWebhook yapılmalı
  const secretToken = request.headers.get("x-telegram-bot-api-secret-token")

  if (!secretToken) {
    console.warn("[TELEGRAM][WEBHOOK] Secret token eksik — istek reddedildi")
    return NextResponse.json({ status: "ok" }) // 200 döndür, ama işleme
  }

  let payload: any
  try {
    payload = await request.json()
  } catch {
    console.error("[TELEGRAM][WEBHOOK] JSON parse hatası")
    return NextResponse.json({ status: "ok" })
  }

  console.log("[TELEGRAM][WEBHOOK] >>>", {
    update_id: payload.update_id,
    has_message: !!payload.message,
    secret_token_prefix: secretToken.slice(0, 8) + "...",
    processingMs: 0,
  })

  try {
    await handleTelegramUpdate(secretToken, payload)
  } catch (err) {
    console.error("[TELEGRAM][WEBHOOK] Hata:", err)
  }

  console.log("[TELEGRAM][WEBHOOK] ✓ done in", Date.now() - arrivalTime, "ms")
  return NextResponse.json({ status: "ok" })
}

// ============================================
// Telegram update'i işle
// secretToken = org_id (webhook kayıt sırasında bu şekilde ayarlandı)
// ============================================
async function handleTelegramUpdate(orgId: string, payload: any) {
  const message = payload.message
  if (!message || !message.text) {
    // Fotoğraf, sticker, vs. — şimdilik sadece metin
    console.log("[TELEGRAM] Metin dışı mesaj, atlanıyor. type:", Object.keys(message || {}).join(","))
    return
  }

  const supabase = getServiceSupabase()

  // Bu org'un Telegram channel_account'ını bul
  const { data: channelAccount } = await supabase
    .from("channel_accounts")
    .select("id, access_token, account_id, page_name")
    .eq("org_id", orgId)
    .eq("channel", "telegram")
    .eq("is_active", true)
    .maybeSingle()

  if (!channelAccount) {
    console.error("[TELEGRAM] channel_account bulunamadı, org_id:", orgId)
    return
  }

  const botToken = channelAccount.access_token
  const chatId = String(message.chat.id)
  const telegramUserId = String(message.from.id)
  const waId = `tg_${telegramUserId}`
  const senderName = [message.from.first_name, message.from.last_name].filter(Boolean).join(" ")
    || message.from.username
    || "Telegram Kullanıcısı"
  const text = message.text
  const msgId = `tg_${message.message_id}`

  console.log("[TELEGRAM] Gelen mesaj:", { chatId, waId, senderName, textLength: text.length })

  // Deduplikasyon
  const { data: existing } = await supabase
    .from("messages")
    .select("id")
    .eq("wa_message_id", msgId)
    .maybeSingle()

  if (existing) {
    console.log("[TELEGRAM] Duplicate mesaj, atlanıyor:", msgId)
    return
  }

  // Contact bul/oluştur
  const contact = await getOrCreateTelegramContact(supabase, orgId, waId, senderName, chatId)
  if (!contact) {
    console.error("[TELEGRAM] Contact oluşturulamadı")
    return
  }

  // Conversation bul/oluştur
  const conversation = await getOrCreateTelegramConversation(supabase, orgId, contact.id, channelAccount.id)
  if (!conversation) {
    console.error("[TELEGRAM] Conversation oluşturulamadı")
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

  console.log("[TELEGRAM] Mesaj kaydedildi | conv:", conversation.id)

  // Bot aktifse AI yanıtı üret ve gönder
  if (BOT_ENABLED && conversation.is_bot_active) {
    try {
      const aiResponse = await getAIResponse(orgId, conversation.id, text, contact.name || undefined)
      const cleanResponse = aiResponse
        .replace("[REQUEST_CONTACT]", "")
        .replace("[TRANSFER_SALES]", "")
        .replace("[NOT_INTERESTED]", "")
        .trim()

      const sendResult = await sendTelegramMessage(botToken, chatId, cleanResponse)

      await supabase.from("messages").insert({
        org_id: orgId,
        conversation_id: conversation.id,
        contact_id: contact.id,
        wa_message_id: sendResult.message_id ? `tg_out_${sendResult.message_id}` : null,
        direction: "outbound",
        type: "text",
        content: { body: cleanResponse },
        status: sendResult.success ? "sent" : "failed",
        sender_type: "bot",
      })

      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: cleanResponse.slice(0, 200),
        })
        .eq("id", conversation.id)

      console.log("[TELEGRAM] Bot yanıtı gönderildi:", sendResult.success)
    } catch (err) {
      console.error("[TELEGRAM] AI yanıtı hatası:", err)
    }
  }
}

// ============================================
// Contact bul / oluştur (Telegram için)
// wa_id = tg_<telegramUserId>
// ============================================
async function getOrCreateTelegramContact(
  supabase: any,
  orgId: string,
  waId: string,
  name: string,
  chatId: string
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
      phone: null,
      name: name || null,
      profile_name: name || null,
      last_message_at: new Date().toISOString(),
      attributes: { telegram_chat_id: chatId },
    })
    .select()
    .single()

  return newContact
}

// ============================================
// Conversation bul / oluştur (Telegram için)
// channel = "telegram", channel_account_id = Telegram channel account
// ============================================
async function getOrCreateTelegramConversation(
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
      channel: "telegram",
      status: "open",
      is_bot_active: true,
      metadata: { channel: "telegram" },
    })
    .select()
    .single()

  if (error) {
    console.error("[TELEGRAM] Conversation oluşturma hatası:", error.message)
    // Race condition — tekrar ara
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
