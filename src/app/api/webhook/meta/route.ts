import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { sendTextMessage, markAsRead } from "@/lib/whatsapp"
import {
  buildDefaultChatbotSettings,
  DEFAULT_PROFANITY_CLOSE_MESSAGE,
  DEFAULT_PROFANITY_CLOSE_THRESHOLD,
  DEFAULT_PROFANITY_WARNING_MESSAGE,
  getAIResponse,
} from "@/lib/gemini"
import { decryptToken } from "@/lib/crypto"

// ============================================
// FORCE DYNAMIC — Bu olmadan Vercel route'u statik cache'e alabilir
// ve Meta webhook POST'ları function'a hiç ulaşmaz!
// ============================================
export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const fetchCache = "force-no-store"

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || "waapi_webhook_verify_2026"
const GRAPH_API = "https://graph.facebook.com/v21.0"
const REQUEST_CONTACT_TAG = "[REQUEST_CONTACT]"
const CONTACT_REQUEST_MESSAGE =
  "Dilerseniz iletişim bilgilerinizi iletin, proje yetkilimiz detaylı bilgi vermek için sizi en kısa sürede arasın."
const CONTACT_FOLLOW_UP_DELAY_MS = 5 * 60 * 1000
const whatsappContactFollowUpTimers = new Map<string, ReturnType<typeof setTimeout>>()

// Yardımcı: secret/token maskeleme
function maskSecret(val: string | null | undefined): string {
  if (!val) return "(empty)"
  if (val.length <= 10) return "***"
  return val.slice(0, 6) + "..." + val.slice(-4)
}

function clearWhatsAppContactFollowUp(conversationId: string) {
  const timer = whatsappContactFollowUpTimers.get(conversationId)
  if (timer) {
    clearTimeout(timer)
    whatsappContactFollowUpTimers.delete(conversationId)
  }
}

function normalizeModerationText(text: string) {
  const translated = text
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")

  const spaced = translated.replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")
  return {
    spaced,
    compact: spaced.replace(/\s+/g, ""),
    tokens: new Set(spaced.split(" ").filter(Boolean)),
  }
}

function containsProfanity(text: string, profanityWords: string[]) {
  const normalizedText = normalizeModerationText(text)
  if (!normalizedText.spaced && !normalizedText.compact) return false

  return profanityWords.some((candidate) => {
    const normalizedCandidate = normalizeModerationText(candidate)
    const term = normalizedCandidate.spaced
    const termCompact = normalizedCandidate.compact

    if (!termCompact) return false
    if (term.includes(" ")) {
      return normalizedText.spaced.includes(term) || normalizedText.compact.includes(termCompact)
    }
    if (termCompact.length <= 3) {
      return normalizedText.tokens.has(termCompact)
    }
    return (
      normalizedText.tokens.has(termCompact) ||
      normalizedText.spaced.includes(term) ||
      normalizedText.compact.includes(termCompact)
    )
  })
}

async function getChatbotModerationSettings(supabase: any, orgId: string) {
  const { data: config } = await supabase
    .from("chatbot_configs")
    .select("id, settings")
    .eq("org_id", orgId)
    .eq("is_active", true)
    .maybeSingle()

  const settings = buildDefaultChatbotSettings(config?.settings)
  const shouldBackfill =
    !!config &&
    (
      !Array.isArray(config.settings?.profanity_words) ||
      !config.settings?.profanity_words?.length ||
      !config.settings?.profanity_warning_message ||
      !config.settings?.profanity_close_message ||
      !config.settings?.profanity_close_threshold
    )

  if (shouldBackfill) {
    await supabase
      .from("chatbot_configs")
      .update({ settings })
      .eq("id", config.id)
  }

  return settings
}

async function getProfanityAction(supabase: any, orgId: string, conversation: any, text: string) {
  const settings = await getChatbotModerationSettings(supabase, orgId)
  const profanityWords = Array.isArray(settings.profanity_words) ? settings.profanity_words : []

  if (!containsProfanity(text, profanityWords)) {
    return null
  }

  const metadata = conversation.metadata || {}
  const count = Number(metadata.profanity_count || 0) + 1
  const threshold = Math.max(Number(settings.profanity_close_threshold) || DEFAULT_PROFANITY_CLOSE_THRESHOLD, 2)
  const shouldClose = count >= threshold
  const nowIso = new Date().toISOString()

  return {
    shouldClose,
    replyText: shouldClose
      ? settings.profanity_close_message || DEFAULT_PROFANITY_CLOSE_MESSAGE
      : settings.profanity_warning_message || DEFAULT_PROFANITY_WARNING_MESSAGE,
    metadata: {
      ...metadata,
      profanity_count: count,
      profanity_detected: true,
      last_profanity_at: nowIso,
      last_profanity_message: text.slice(0, 200),
      profanity_closed_at: shouldClose ? nowIso : metadata.profanity_closed_at || null,
    },
  }
}

function parseAIResponse(aiResponse: string) {
  const requestContact = aiResponse.includes(REQUEST_CONTACT_TAG)
  const transferToSales = aiResponse.includes("[TRANSFER_SALES]")
  const notInterested = aiResponse.includes("[NOT_INTERESTED]")
  const cleanResponse = requestContact
    ? CONTACT_REQUEST_MESSAGE
    : aiResponse
        .replace(REQUEST_CONTACT_TAG, "")
        .replace("[TRANSFER_SALES]", "")
        .replace("[NOT_INTERESTED]", "")
        .trim()

  return { requestContact, transferToSales, notInterested, cleanResponse }
}

function looksLikeContactInfo(text: string) {
  const normalized = text.trim()
  if (!normalized) return false

  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  const digitCount = normalized.replace(/\D/g, "").length
  return emailRegex.test(normalized) || digitCount >= 10
}

async function getProjectContactInfo(supabase: any, orgId: string) {
  const { data: company } = await supabase
    .from("companies")
    .select("phone, email")
    .eq("org_id", orgId)
    .or("phone.not.is.null,email.not.is.null")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .maybeSingle()

  return {
    phone:
      company?.phone ||
      org?.settings?.contact_phone ||
      org?.settings?.support_phone ||
      null,
    email:
      company?.email ||
      org?.settings?.contact_email ||
      org?.settings?.support_email ||
      null,
  }
}

function buildContactFollowUpMessage(contactInfo: { phone: string | null; email: string | null }) {
  if (contactInfo.phone && contactInfo.email) {
    return `Sizden cevap alamadım. Dilerseniz ${contactInfo.phone} numaralı telefonumuzu arayabilir veya ${contactInfo.email} adresine e-posta gönderebilirsiniz.`
  }
  if (contactInfo.phone) {
    return `Sizden cevap alamadım. Dilerseniz ${contactInfo.phone} numaralı telefonumuzu arayabilirsiniz.`
  }
  if (contactInfo.email) {
    return `Sizden cevap alamadım. Dilerseniz ${contactInfo.email} adresine e-posta gönderebilirsiniz.`
  }
  return "Sizden cevap alamadım. Dilerseniz iletişim bilgilerinizi paylaşabilir, proje yetkilimizin sizinle iletişime geçmesini sağlayabilirsiniz."
}

async function sendWhatsAppBotMessage(params: {
  supabase: any
  orgId: string
  conversationId: string
  contactId: string
  phoneNumberId: string
  accessToken: string
  recipientWaId: string
  text: string
}) {
  const result = await sendTextMessage(
    params.phoneNumberId,
    params.accessToken,
    params.recipientWaId,
    params.text
  )
  const waMessageId = result.success ? result.messages?.[0]?.id || null : null

  await params.supabase.from("messages").insert({
    org_id: params.orgId,
    conversation_id: params.conversationId,
    contact_id: params.contactId,
    wa_message_id: waMessageId,
    direction: "outbound",
    type: "text",
    content: { body: params.text },
    status: result.success ? "sent" : "failed",
    sender_type: "bot",
  })

  return { result, waMessageId }
}

function scheduleWhatsAppContactFollowUp(params: {
  conversationId: string
  orgId: string
  contactId: string
  phoneNumberId: string
  accessToken: string
  recipientWaId: string
  requestedAt: string
}) {
  clearWhatsAppContactFollowUp(params.conversationId)

  const timer = setTimeout(async () => {
    const supabase = getServiceSupabase()

    try {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("id, metadata")
        .eq("id", params.conversationId)
        .maybeSingle()

      const metadata = conversation?.metadata || {}
      if (!metadata.awaiting_contact_response || metadata.contact_request_at !== params.requestedAt) {
        return
      }

      const { data: replies } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", params.conversationId)
        .eq("direction", "inbound")
        .gt("created_at", params.requestedAt)
        .limit(1)

      if ((replies || []).length > 0) {
        return
      }

      const contactInfo = await getProjectContactInfo(supabase, params.orgId)
      const followUpText = buildContactFollowUpMessage(contactInfo)

      await sendWhatsAppBotMessage({
        supabase,
        orgId: params.orgId,
        conversationId: params.conversationId,
        contactId: params.contactId,
        phoneNumberId: params.phoneNumberId,
        accessToken: params.accessToken,
        recipientWaId: params.recipientWaId,
        text: followUpText,
      })

      await supabase
        .from("conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: followUpText.slice(0, 200),
          metadata: {
            ...metadata,
            awaiting_contact_response: false,
            contact_request_at: null,
            contact_follow_up_sent_at: new Date().toISOString(),
          },
        })
        .eq("id", params.conversationId)
    } catch (error) {
      console.error("[WHATSAPP][CONTACT_FOLLOWUP][ERROR]", error)
    } finally {
      whatsappContactFollowUpTimers.delete(params.conversationId)
    }
  }, CONTACT_FOLLOW_UP_DELAY_MS)

  whatsappContactFollowUpTimers.set(params.conversationId, timer)
}

// GET — Meta webhook doğrulama (challenge)
export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams } = url
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  // DEBUG: Her GET isteğini logla — Meta verification veya health check
  console.log("[WEBHOOK][GET] >>> hub.mode:", mode)
  console.log("[WEBHOOK][GET] >>> hub.verify_token:", token)
  console.log("[WEBHOOK][GET] >>> hub.challenge:", challenge)
  console.log("[WEBHOOK][GET] >>> ENV META_WEBHOOK_VERIFY_TOKEN:", VERIFY_TOKEN)
  console.log("[WEBHOOK][GET] >>>", {
    path: url.pathname,
    query: url.search,
    userAgent: request.headers.get("user-agent")?.slice(0, 120),
    xForwardedFor: request.headers.get("x-forwarded-for"),
    xVercelId: request.headers.get("x-vercel-id"),
    timestamp: new Date().toISOString(),
  })

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WEBHOOK][GET] ✓ Verification passed, returning challenge:", challenge)
    return new Response(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  console.log("[WEBHOOK][GET] ✗ Verification failed — mode:", mode, "token match:", token === VERIFY_TOKEN)
  return NextResponse.json({ error: "Forbidden", reason: "verify_token_mismatch" }, { status: 403 })
}

// POST — Gelen webhook'ları işle (WhatsApp + Instagram + Facebook)
export async function POST(request: Request) {
  // ============================================
  // TOP-LEVEL DEBUG — Bu log JSON parse'dan ÖNCE çalışır.
  // Eğer bu log Vercel'de görünmüyorsa, request function'a ulaşmıyor demektir.
  // ============================================
  const arrivalTime = Date.now()
  const url = new URL(request.url)
  console.log("[WEBHOOK][POST] >>> REQUEST ARRIVED <<<", {
    path: url.pathname,
    method: request.method,
    contentType: request.headers.get("content-type"),
    contentLength: request.headers.get("content-length"),
    userAgent: request.headers.get("user-agent")?.slice(0, 120),
    xHubSignature: maskSecret(request.headers.get("x-hub-signature-256")),
    xForwardedFor: request.headers.get("x-forwarded-for"),
    xVercelId: request.headers.get("x-vercel-id"),
    host: request.headers.get("host"),
    timestamp: new Date().toISOString(),
  })

  try {
    const rawBody = await request.text()
    console.log("[WEBHOOK][POST] raw body length:", rawBody.length, "first 1000:", rawBody.slice(0, 1000))

    let payload: any
    try {
      payload = JSON.parse(rawBody)
    } catch (parseErr) {
      console.error("[WEBHOOK][POST] JSON parse hatası:", parseErr, "body:", rawBody.slice(0, 500))
      return NextResponse.json({ status: "ok" })
    }

    const object = payload.object
    const entryCount = payload.entry?.length || 0
    const firstEntryId = payload.entry?.[0]?.id || "(none)"
    const messagingCount = payload.entry?.[0]?.messaging?.length || 0
    const changesCount = payload.entry?.[0]?.changes?.length || 0

    console.log("[WEBHOOK][POST] parsed:", {
      object,
      entryCount,
      firstEntryId,
      messagingCount,
      changesCount,
      processingMs: Date.now() - arrivalTime,
    })

    if (object === "whatsapp_business_account") {
      await handleWhatsAppWebhook(payload)
    } else if (object === "instagram") {
      console.log("[WEBHOOK][POST] → Instagram webhook geldi! entry.id:", firstEntryId)
      await handleInstagramWebhook(payload)
    } else if (object === "page") {
      console.log("[WEBHOOK][POST] → Page webhook geldi — entry.id:", firstEntryId, "messaging:", messagingCount)
      await handlePageWebhook(payload)
    } else {
      console.log("[WEBHOOK][POST] → Bilinmeyen object:", object)
    }

    console.log("[WEBHOOK][POST] ✓ done in", Date.now() - arrivalTime, "ms")
    return NextResponse.json({ status: "ok" })
  } catch (e) {
    console.error("[WEBHOOK][POST] ✗ HATA:", e)
    return NextResponse.json({ status: "ok" })
  }
}

// ============================================
// WHATSAPP WEBHOOK (mevcut — değişiklik yok)
// ============================================
async function handleWhatsAppWebhook(payload: any) {
  const supabase = getServiceSupabase()

  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value || {}
      const phoneNumberId = value.metadata?.phone_number_id
      const displayPhoneNumber = value.metadata?.display_phone_number
      console.log("[WHATSAPP][NORMALIZED]", {
        entry_id: entry.id,
        field: change.field,
        phone_number_id: phoneNumberId,
        display_phone_number: displayPhoneNumber,
        messages_count: (value.messages || []).length,
        statuses_count: (value.statuses || []).length,
      })
      if (!phoneNumberId) continue

      const { data: phoneById } = await supabase
        .from("phone_numbers")
        .select("*")
        .eq("phone_number_id", phoneNumberId)
        .eq("is_active", true)
        .maybeSingle()

      let phone = phoneById

      if (!phone && displayPhoneNumber) {
        const { data: phoneByDisplay } = await supabase
          .from("phone_numbers")
          .select("*")
          .eq("display_number", displayPhoneNumber)
          .eq("is_active", true)
          .maybeSingle()

        phone = phoneByDisplay
      }

      if (!phone) {
        console.error("[WHATSAPP][ERROR] mapping_not_found", {
          phone_number_id: phoneNumberId,
          display_phone_number: displayPhoneNumber,
        })
        continue
      }

      const { data: waba } = await supabase
        .from("waba_accounts")
        .select("*")
        .eq("id", phone.waba_id)
        .maybeSingle()

      if (!waba) {
        console.error("[WHATSAPP][ERROR] mapping_not_found", {
          phone_number_id: phoneNumberId,
          display_phone_number: displayPhoneNumber,
        })
        continue
      }

      console.log("[WHATSAPP][MAPPING]", {
        phone_number_id: phone.phone_number_id,
        display_phone_number: phone.display_number,
        org_id: waba.org_id,
        waba_id: waba.waba_id,
      })

      // Access token'ı decrypt et
      let accessToken: string
      try {
        accessToken = decryptToken(waba.access_token)
      } catch {
        // Decrypt başarısızsa, token düz metin olabilir
        accessToken = waba.access_token
      }

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

    // ---- DIAGNOSTIC START ----
    const hasMessaging = Array.isArray(entry.messaging) && entry.messaging.length > 0
    const hasChanges = Array.isArray(entry.changes) && entry.changes.length > 0
    const eventType = hasMessaging ? "messaging" : hasChanges ? "changes" : "unknown"
    console.log("[IG EVENT TYPE]:", eventType, "| igAccountId:", igAccountId, "| messaging:", entry.messaging?.length || 0, "| changes:", entry.changes?.length || 0)

    if (hasChanges) {
      for (const ch of entry.changes) {
        const field = ch.field
        const val = ch.value
        console.log("[IG CHANGE] field:", field, "| value keys:", val ? Object.keys(val) : [])
        // Look for text in changes.value
        const textInChange = val?.message?.text || val?.text || val?.messages?.[0]?.text || null
        if (textInChange) {
          console.log("[IG TEXT FOUND IN CHANGES] field:", field, "| text:", textInChange)
        } else {
          console.log("[IG CHANGE VALUE DUMP]:", JSON.stringify(val)?.slice(0, 500))
        }
      }
    }

    if (hasMessaging) {
      for (const m of entry.messaging) {
        const text = m.message?.text || m.message?.attachments?.[0]?.type || null
        if (text) {
          console.log("[IG TEXT FOUND IN MESSAGING] sender:", m.sender?.id, "| text:", text)
        }
      }
    }

    if (!hasMessaging && !hasChanges) {
      console.log("[IG EVENT TYPE]: unknown | full entry keys:", Object.keys(entry))
    }
    // ---- DIAGNOSTIC END ----

    console.log("[IG-WEBHOOK] Processing entry, igAccountId:", igAccountId, "messaging count:", entry.messaging?.length || 0)

    // Önce channel_accounts tablosundan bul
    let channelAccount = await findChannelAccount(supabase, "instagram", igAccountId)
    let orgId: string
    let accessToken: string
    let accountId: string
    let channelAccountId: string | null = null

    if (channelAccount) {
      orgId = channelAccount.org_id
      // Token decrypt desteği (WhatsApp handler ile tutarlı)
      try {
        accessToken = decryptToken(channelAccount.access_token)
      } catch {
        accessToken = channelAccount.access_token
      }
      accountId = channelAccount.account_id
      channelAccountId = channelAccount.id
      console.log("[IG-WEBHOOK] ✓ channel_accounts'tan bulundu, org:", orgId, "token:", maskSecret(accessToken))
    } else {
      // Fallback: eski yöntem ile org bul (henüz migrate edilmemiş org'lar için)
      console.log("[IG-WEBHOOK] channel_accounts'ta bulunamadı, fallback deneniyor...")
      const org = await findOrgByChannelId(supabase, "instagram_account_id", igAccountId)
      if (!org) {
        console.log("[IG-WEBHOOK] ✗ Org da bulunamadı, atlanıyor. igAccountId:", igAccountId)
        continue
      }
      orgId = org.id
      accessToken = org.settings?.instagram_page_token
      accountId = org.settings?.instagram_account_id
      console.log("[IG-WEBHOOK] Fallback org bulundu:", orgId)
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

      // Bot aktifse yanıt — MANUEL TEST İÇİN GEÇİCİ OLARAK DEVRE DIŞI
      if (!!process.env.INSTAGRAM_BOT_ACTIVE && conversation.is_bot_active) {
        const profanityAction = await getProfanityAction(supabase, orgId, conversation, text)
        if (profanityAction) {
          const replyMsgId = await sendInstagramReply({ access_token: accessToken, account_id: accountId }, senderId, profanityAction.replyText)

          await supabase.from("messages").insert({
            org_id: orgId,
            conversation_id: conversation.id,
            contact_id: contact.id,
            wa_message_id: replyMsgId,
            direction: "outbound",
            type: "text",
            content: { body: profanityAction.replyText },
            status: "sent",
            sender_type: "bot",
          })

          const convUpdate: any = {
            last_message_at: new Date().toISOString(),
            last_message_preview: profanityAction.replyText.slice(0, 200),
            metadata: profanityAction.metadata,
          }
          if (profanityAction.shouldClose) {
            convUpdate.status = "resolved"
            convUpdate.is_bot_active = false
          }

          await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
          continue
        }

        const aiResponse = await getAIResponse(orgId, conversation.id, text, contact.name || undefined)
        const { transferToSales, notInterested, cleanResponse } = parseAIResponse(aiResponse)

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
        if (transferToSales) { convUpdate.status = "open"; convUpdate.is_bot_active = false }
        if (notInterested) { convUpdate.status = "resolved"; convUpdate.is_bot_active = false }

        await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
      }
    }
  }
}

// ============================================
// PAGE WEBHOOK — Instagram DM veya Facebook Messenger (ikisi de object:"page" gelir)
// ============================================
// Platform tespiti — güvenli sıra:
//
//  1. recipient.id ≠ pageId → Meta Instagram DM formatı
//     (recipient = IG Business Account ID)
//     Önce account_id ile, sonra page_id ile ara.
//
//  2. recipient.id === pageId → Meta kesinlikle Facebook Messenger
//     Bu durumda Instagram lookup override edilir.
//
//  3. recipient.id yoksa (sadece changes eventi) → page_id ile ara,
//     Instagram bulunursa Instagram, bulunamazsa Facebook.
//
// NOT: Sadece recipient.id bilgisini overriding kural olarak kullan.
// page_id lookup = fallback. account_id lookup = birincil.
// ============================================
async function handlePageWebhook(payload: any) {
  const supabase = getServiceSupabase()

  for (const entry of payload.entry || []) {
    const pageId = entry.id
    if (!pageId) continue

    const msgCount = entry.messaging?.length || 0
    const chgCount = entry.changes?.length || 0
    const recipientId = entry.messaging?.[0]?.recipient?.id
    const firstSenderId = entry.messaging?.[0]?.sender?.id

    console.log("[META][RAW] object:page | pageId:", pageId, "| recipientId:", recipientId, "| senderId:", firstSenderId, "| messaging:", msgCount, "| changes:", chgCount)

    let igAccount: any = null

    if (recipientId && recipientId !== pageId) {
      // recipient ≠ page → Instagram DM: recipient = IG Business Account ID
      igAccount = await findChannelAccount(supabase, "instagram", recipientId)
      if (igAccount) {
        console.log("[META][MAPPING] platform=instagram via recipient.id | acct:", igAccount.id, "| org:", igAccount.org_id)
      } else {
        // Fallback: DB'de page_id üzerinden kayıtlı olabilir
        igAccount = await findChannelAccountByPageId(supabase, "instagram", pageId)
        if (igAccount) {
          console.log("[META][MAPPING] platform=instagram via page_id fallback | acct:", igAccount.id)
        } else {
          console.log("[META][NORMALIZED] recipient≠pageId but no Instagram account found | recipientId:", recipientId, "| pageId:", pageId)
        }
      }
    } else if (!recipientId) {
      // Messaging eventi yok (changes only) — page_id fallback
      igAccount = await findChannelAccountByPageId(supabase, "instagram", pageId)
      if (igAccount) {
        console.log("[META][MAPPING] platform=instagram (no-messaging) via page_id | acct:", igAccount.id)
      }
    }
    // recipientId === pageId → Facebook Messenger, igAccount = null (doğru)

    if (recipientId === pageId && igAccount) {
      // recipient = pageId → bu mesaj Messenger, yanlışlıkla igAccount bulunmuşsa iptal et
      console.log("[META][NORMALIZED] recipient.id===pageId → overriding to Facebook Messenger | pageId:", pageId)
      igAccount = null
    }

    if (igAccount) {
      console.log("[META][MAPPING] final=instagram | connectedAccountId:", igAccount.id, "| org:", igAccount.org_id)
      await handleInstagramEntry(supabase, entry, igAccount)
    } else {
      const fbAccount = await findChannelAccountByPageId(supabase, "facebook", pageId)
      if (!fbAccount) {
        console.log("[META][ERROR] mapping_not_found | pageId:", pageId, "| no Facebook/Instagram account matched")
      } else {
        console.log("[META][MAPPING] final=facebook | connectedAccountId:", fbAccount.id, "| org:", fbAccount.org_id)
      }
      await handleFacebookEntry(supabase, entry, pageId)
    }
  }
}

// ============================================
// INSTAGRAM ENTRY İŞLE (page webhook'tan gelen)
// ============================================
async function handleInstagramEntry(supabase: any, entry: any, channelAccount: any) {
  const orgId = channelAccount.org_id
  // Token decrypt desteği
  let accessToken: string
  try {
    accessToken = decryptToken(channelAccount.access_token)
  } catch {
    accessToken = channelAccount.access_token
  }
  const accountId = channelAccount.account_id
  const channelAccountId = channelAccount.id
  const pageId = entry.id

  for (const messaging of entry.messaging || []) {
    const senderId = messaging.sender?.id
    const messageData = messaging.message
    if (!senderId || !messageData || senderId === pageId || senderId === accountId) continue

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
    if (!contact) {
      console.error("[META][ERROR] contact_create_failed | platform:instagram | senderId:", senderId)
      continue
    }
    console.log("[META][NORMALIZED] platform=instagram | connectedAccountId:", channelAccountId, "| customerId:", `ig_${senderId}`, "| recipientId:", pageId, "| senderId:", senderId)

    // Conversation bul/oluştur
    const conversation = await getOrCreateConversation(supabase, orgId, contact.id, null, "instagram", channelAccountId)
    if (!conversation) {
      console.error("[META][ERROR] conversation_create_failed | platform:instagram | contactId:", contact.id)
      continue
    }

    // Mesajı kaydet
    const { error: msgErr } = await supabase.from("messages").insert({
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
    if (!msgErr) {
      console.log("[META][MESSAGE] stored | platform=instagram | msgId:", msgId, "| convId:", conversation.id)
    }

    // Conversation güncelle
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: text.slice(0, 200),
        unread_count: (conversation.unread_count || 0) + 1,
      })
      .eq("id", conversation.id)

    // Bot aktifse yanıt — MANUEL TEST İÇİN GEÇİCİ OLARAK DEVRE DIŞI
    if (!!process.env.INSTAGRAM_BOT_ACTIVE && conversation.is_bot_active) {
      const profanityAction = await getProfanityAction(supabase, orgId, conversation, text)
      if (profanityAction) {
        const replyMsgId = await sendInstagramReply({ access_token: accessToken, account_id: accountId }, senderId, profanityAction.replyText)

        await supabase.from("messages").insert({
          org_id: orgId,
          conversation_id: conversation.id,
          contact_id: contact.id,
          wa_message_id: replyMsgId,
          direction: "outbound",
          type: "text",
          content: { body: profanityAction.replyText },
          status: "sent",
          sender_type: "bot",
        })

        const convUpdate: any = {
          last_message_at: new Date().toISOString(),
          last_message_preview: profanityAction.replyText.slice(0, 200),
          metadata: profanityAction.metadata,
        }
        if (profanityAction.shouldClose) {
          convUpdate.status = "resolved"
          convUpdate.is_bot_active = false
        }

        await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
        continue
      }

      const aiResponse = await getAIResponse(orgId, conversation.id, text, contact.name || undefined)
      const { transferToSales, notInterested, cleanResponse } = parseAIResponse(aiResponse)

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
      if (transferToSales) { convUpdate.status = "open"; convUpdate.is_bot_active = false }
      if (notInterested) { convUpdate.status = "resolved"; convUpdate.is_bot_active = false }

      await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
    }
  }
}

// ============================================
// FACEBOOK ENTRY İŞLE (page webhook'tan gelen)
// ============================================
async function handleFacebookEntry(supabase: any, entry: any, pageId: string) {
  // Önce channel_accounts tablosundan bul
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
    const org = await findOrgByChannelId(supabase, "facebook_page_id", pageId)
    if (!org) return
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

    const { data: existing } = await supabase
      .from("messages")
      .select("id")
      .eq("wa_message_id", msgId)
      .single()
    if (existing) continue

    const senderName = await getFacebookUsername(accessToken, senderId)
    const contact = await getOrCreateContact(supabase, orgId, `fb_${senderId}`, senderName, "facebook")
    if (!contact) {
      console.error("[META][ERROR] contact_create_failed | platform:facebook | senderId:", senderId)
      continue
    }
    console.log("[META][NORMALIZED] platform=messenger | connectedAccountId:", channelAccountId, "| customerId:", `fb_${senderId}`, "| pageId:", pageId)

    const conversation = await getOrCreateConversation(supabase, orgId, contact.id, null, "facebook", channelAccountId)
    if (!conversation) {
      console.error("[META][ERROR] conversation_create_failed | platform:facebook | contactId:", contact.id)
      continue
    }

    const { error: msgErr } = await supabase.from("messages").insert({
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
    if (!msgErr) {
      console.log("[META][MESSAGE] stored | platform=messenger | msgId:", msgId, "| convId:", conversation.id)
    }

    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: text.slice(0, 200),
        unread_count: (conversation.unread_count || 0) + 1,
      })
      .eq("id", conversation.id)

    if (conversation.is_bot_active) {
      const profanityAction = await getProfanityAction(supabase, orgId, conversation, text)
      if (profanityAction) {
        const replyMsgId = await sendFacebookReply({ access_token: accessToken, page_id: fbPageId }, senderId, profanityAction.replyText)

        await supabase.from("messages").insert({
          org_id: orgId,
          conversation_id: conversation.id,
          contact_id: contact.id,
          wa_message_id: replyMsgId,
          direction: "outbound",
          type: "text",
          content: { body: profanityAction.replyText },
          status: "sent",
          sender_type: "bot",
        })

        const convUpdate: any = {
          last_message_at: new Date().toISOString(),
          last_message_preview: profanityAction.replyText.slice(0, 200),
          metadata: profanityAction.metadata,
        }
        if (profanityAction.shouldClose) {
          convUpdate.status = "resolved"
          convUpdate.is_bot_active = false
        }

        await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
        continue
      }

      const aiResponse = await getAIResponse(orgId, conversation.id, text, contact.name || undefined)
      const { transferToSales, notInterested, cleanResponse } = parseAIResponse(aiResponse)

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
      if (transferToSales) { convUpdate.status = "open"; convUpdate.is_bot_active = false }
      if (notInterested) { convUpdate.status = "resolved"; convUpdate.is_bot_active = false }

      await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
    }
  }
}

// ============================================
// FACEBOOK MESSENGER WEBHOOK (eski — artık handlePageWebhook kullanılıyor)
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
        const profanityAction = await getProfanityAction(supabase, orgId, conversation, text)
        if (profanityAction) {
          const replyMsgId = await sendFacebookReply({ access_token: accessToken, page_id: fbPageId }, senderId, profanityAction.replyText)

          await supabase.from("messages").insert({
            org_id: orgId,
            conversation_id: conversation.id,
            contact_id: contact.id,
            wa_message_id: replyMsgId,
            direction: "outbound",
            type: "text",
            content: { body: profanityAction.replyText },
            status: "sent",
            sender_type: "bot",
          })

          const convUpdate: any = {
            last_message_at: new Date().toISOString(),
            last_message_preview: profanityAction.replyText.slice(0, 200),
            metadata: profanityAction.metadata,
          }
          if (profanityAction.shouldClose) {
            convUpdate.status = "resolved"
            convUpdate.is_bot_active = false
          }

          await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
          continue
        }

        const aiResponse = await getAIResponse(orgId, conversation.id, text, contact.name || undefined)
        const { transferToSales, notInterested, cleanResponse } = parseAIResponse(aiResponse)

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
        if (transferToSales) { convUpdate.status = "open"; convUpdate.is_bot_active = false }
        if (notInterested) { convUpdate.status = "resolved"; convUpdate.is_bot_active = false }

        await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
      }
    }
  }
}

// ============================================
// HELPER: channel_accounts tablosundan hesap bul
// ============================================
async function findChannelAccount(supabase: any, channel: string, accountId: string) {
  const { data, error } = await supabase
    .from("channel_accounts")
    .select("*")
    .eq("channel", channel)
    .eq("account_id", accountId)
    .eq("is_active", true)
    .maybeSingle()

  console.log(`[META][LOOKUP] findChannelAccount channel=${channel} accountId=${accountId} → ${data ? `FOUND id=${data.id} page_id=${data.page_id}` : `NOT FOUND`}${error ? ` ERR=${error.message}` : ""}`)
  return data
}

// Facebook webhook'lar page_id ile gelir, account_id veya page_id olabilir
async function findChannelAccountByPageId(supabase: any, channel: string, pageId: string) {
  // Önce page_id kolonu ile dene
  const { data: byPageId } = await supabase
    .from("channel_accounts")
    .select("*")
    .eq("channel", channel)
    .eq("page_id", pageId)
    .eq("is_active", true)
    .maybeSingle()

  if (byPageId) {
    console.log(`[META][LOOKUP] findChannelAccountByPageId channel=${channel} pageId=${pageId} → FOUND via page_id id=${byPageId.id} account_id=${byPageId.account_id}`)
    return byPageId
  }

  // Fallback: account_id kolonu ile dene (eski kayıtlar için)
  const { data: byAccountId } = await supabase
    .from("channel_accounts")
    .select("*")
    .eq("channel", channel)
    .eq("account_id", pageId)
    .eq("is_active", true)
    .maybeSingle()

  if (byAccountId) {
    console.log(`[META][LOOKUP] findChannelAccountByPageId channel=${channel} pageId=${pageId} → FOUND via account_id id=${byAccountId.id}`)
  } else {
    // DB'deki tüm aktif hesapları logla (hangileri var görmek için)
    const { data: allAccounts } = await supabase
      .from("channel_accounts")
      .select("id, channel, account_id, page_id")
      .eq("channel", channel)
      .eq("is_active", true)
    console.log(`[META][LOOKUP] findChannelAccountByPageId channel=${channel} pageId=${pageId} → NOT FOUND. Active ${channel} accounts in DB:`, JSON.stringify(allAccounts || []))
  }
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
  console.log("[WHATSAPP][CONVERSATION]", {
    conversation_id: conversation.id,
    contact_id: contact.id,
    phone_number_id: phone.phone_number_id,
    org_id: waba.org_id,
  })

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
  console.log("[WHATSAPP][MESSAGE]", {
    wa_message_id: msgId,
    conversation_id: conversation.id,
    contact_id: contact.id,
    type: msgType,
    direction: "inbound",
  })

  const conversationMetadata = conversation.metadata || {}

  await supabase.from("conversations").update({
    last_message_at: new Date().toISOString(),
    last_message_preview: text.slice(0, 200),
    unread_count: (conversation.unread_count || 0) + 1,
  }).eq("id", conversation.id)

  await markAsRead(phone.phone_number_id, accessToken, msgId)

  const profanityAction = await getProfanityAction(supabase, waba.org_id, conversation, text)
  if (profanityAction) {
    clearWhatsAppContactFollowUp(conversation.id)

    await sendWhatsAppBotMessage({
      supabase,
      orgId: waba.org_id,
      conversationId: conversation.id,
      contactId: contact.id,
      phoneNumberId: phone.phone_number_id,
      accessToken,
      recipientWaId: senderWaId,
      text: profanityAction.replyText,
    })

    const convUpdate: any = {
      last_message_at: new Date().toISOString(),
      last_message_preview: profanityAction.replyText.slice(0, 200),
      metadata: {
        ...profanityAction.metadata,
        awaiting_contact_response: false,
        contact_request_at: null,
      },
    }
    if (profanityAction.shouldClose) {
      convUpdate.status = "resolved"
      convUpdate.is_bot_active = false
    }

    await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)
    return
  }

  if (conversationMetadata.awaiting_contact_response) {
    clearWhatsAppContactFollowUp(conversation.id)

    if (!looksLikeContactInfo(text)) {
      const contactInfo = await getProjectContactInfo(supabase, waba.org_id)
      const followUpText = buildContactFollowUpMessage(contactInfo)

      await sendWhatsAppBotMessage({
        supabase,
        orgId: waba.org_id,
        conversationId: conversation.id,
        contactId: contact.id,
        phoneNumberId: phone.phone_number_id,
        accessToken,
        recipientWaId: senderWaId,
        text: followUpText,
      })

      await supabase.from("conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: followUpText.slice(0, 200),
        metadata: {
          ...conversationMetadata,
          awaiting_contact_response: false,
          contact_request_at: null,
          contact_follow_up_sent_at: new Date().toISOString(),
        },
      }).eq("id", conversation.id)

      return
    }

    await supabase.from("conversations").update({
      metadata: {
        ...conversationMetadata,
        awaiting_contact_response: false,
        contact_request_at: null,
      },
    }).eq("id", conversation.id)
  }

  if (conversation.is_bot_active) {
    const aiResponse = await getAIResponse(waba.org_id, conversation.id, text)
    const { requestContact, transferToSales, notInterested, cleanResponse } = parseAIResponse(aiResponse)

    await sendWhatsAppBotMessage({
      supabase,
      orgId: waba.org_id,
      conversationId: conversation.id,
      contactId: contact.id,
      phoneNumberId: phone.phone_number_id,
      accessToken,
      recipientWaId: senderWaId,
      text: cleanResponse,
    })

    const contactRequestAt = requestContact ? new Date().toISOString() : null
    const convUpdate: any = {
      last_message_at: new Date().toISOString(),
      last_message_preview: cleanResponse.slice(0, 200),
      metadata: {
        ...conversationMetadata,
        awaiting_contact_response: requestContact,
        contact_request_at: contactRequestAt,
        contact_follow_up_sent_at: null,
      },
    }
    if (transferToSales) { convUpdate.status = "open"; convUpdate.is_bot_active = false }
    if (notInterested) { convUpdate.status = "resolved"; convUpdate.is_bot_active = false }

    await supabase.from("conversations").update(convUpdate).eq("id", conversation.id)

    if (requestContact && contactRequestAt) {
      scheduleWhatsAppContactFollowUp({
        conversationId: conversation.id,
        orgId: waba.org_id,
        contactId: contact.id,
        phoneNumberId: phone.phone_number_id,
        accessToken,
        recipientWaId: senderWaId,
        requestedAt: contactRequestAt,
      })
    }
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
// Unique key mantığı:
//   - WhatsApp: (org_id, contact_id, phone_number_id)
//   - Instagram/Facebook: (org_id, contact_id, channel_account_id)
//   - Fallback (eski kayıtlar): (org_id, contact_id) — backward compat
// Bu sayede aynı müşteri farklı kanallarda/hesaplarda ayrı conversation alır.
// ============================================
async function getOrCreateConversation(
  supabase: any, orgId: string, contactId: string, phoneNumberId: string | null,
  channel: string = "whatsapp", channelAccountId: string | null = null
) {
  // Unique key: channel_account_id (IG/FB) veya phone_number_id (WA) ile izolasyon
  let query = supabase
    .from("conversations")
    .select("*")
    .eq("org_id", orgId)
    .eq("contact_id", contactId)
    .in("status", ["open", "assigned"])

  if (channelAccountId) {
    // Instagram / Facebook: hesap bazında izolasyon
    query = query.eq("channel_account_id", channelAccountId)
  } else if (phoneNumberId) {
    // WhatsApp: numara bazında izolasyon
    query = query.eq("phone_number_id", phoneNumberId)
  }
  // channelAccountId ve phoneNumberId yoksa: eski davranış (backward compat)

  const { data: existing, error: findErr } = await query.maybeSingle()

  if (findErr) {
    console.error("[META][ERROR] conversation_find_failed:", findErr.message, "| org:", orgId, "| contact:", contactId)
  }

  const uniqueKey = channelAccountId
    ? `${channel}:acct=${channelAccountId}:contact=${contactId}`
    : phoneNumberId
    ? `whatsapp:phone=${phoneNumberId}:contact=${contactId}`
    : `${channel}:contact=${contactId}`

  if (existing) {
    console.log("[META][CONVERSATION] found | id:", existing.id, "| key:", uniqueKey)
    return existing
  }

  console.log("[META][CONVERSATION] create | key:", uniqueKey)

  const insert: any = {
    org_id: orgId,
    contact_id: contactId,
    status: "open",
    is_bot_active: true,
    metadata: { channel },
    channel,          // doğrudan channel kolonu (migration sonrası aktif)
  }
  if (phoneNumberId) insert.phone_number_id = phoneNumberId
  if (channelAccountId) insert.channel_account_id = channelAccountId

  const { data: newConv, error: createErr } = await supabase
    .from("conversations")
    .insert(insert)
    .select()
    .single()

  if (createErr) {
    console.error("[META][ERROR] conversation_create_failed:", createErr.message, "| key:", uniqueKey)
    // Race condition ihtimaline karşı tekrar dene (aynı sorgu ile)
    const { data: retryConv } = await query.maybeSingle()
    if (retryConv) {
      console.log("[META][CONVERSATION] race-retry found | id:", retryConv.id)
      return retryConv
    }
    return null
  }

  console.log("[META][CONVERSATION] created | id:", newConv?.id, "| key:", uniqueKey)
  return newConv
}
