import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"
import { sendTextMessage, sendTemplateMessage } from "@/lib/whatsapp"
import { decryptToken } from "@/lib/crypto"

// GET — Konuşmanın mesajlarını getir
export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { conversationId } = await params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("per_page") || "50")

  const supabase = getServiceSupabase()

  // Konuşma org'a ait mi kontrol
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("org_id", auth.org_id)
    .single()

  if (!conv) {
    return NextResponse.json({ detail: "Konusma bulunamadi" }, { status: 404 })
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .range((page - 1) * perPage, page * perPage - 1)

  return NextResponse.json(
    (messages || []).map((m: any) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      direction: m.direction,
      type: m.type,
      content: m.content,
      status: m.status,
      sender_type: m.sender_type,
      created_at: m.created_at,
    }))
  )
}

// POST — Agent olarak mesaj gönder
export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { conversationId } = await params
  const { text, template_name, language, template_body } = await request.json()

  if (!text && !template_name) {
    return NextResponse.json({ detail: "Mesaj metni veya şablon adı zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Konuşma + contact bilgisi
  const { data: conv } = await supabase
    .from("conversations")
    .select("*, contact:contacts(*)")
    .eq("id", conversationId)
    .eq("org_id", auth.org_id)
    .single()

  if (!conv) {
    return NextResponse.json({ detail: "Konusma bulunamadi" }, { status: 404 })
  }

  const channel = conv.channel || conv.metadata?.channel || "whatsapp"
  let waMessageId: string | null = null

  if (channel === "instagram" || channel === "facebook") {
    // Try channel_accounts first (new multi-account approach)
    const channelAccountId = conv.channel_account_id
    let accessToken: string | null = null
    let accountId: string | null = null
    let pageId: string | null = null

    if (channelAccountId) {
      const { data: chAccount } = await supabase
        .from("channel_accounts")
        .select("*")
        .eq("id", channelAccountId)
        .eq("is_active", true)
        .single()

      if (!chAccount) {
        return NextResponse.json(
          { detail: "Bu kanal hesabı aktif değil. Lütfen Kanallar sayfasından aktif hesap seçin." },
          { status: 400 }
        )
      }

      accessToken = chAccount.access_token
      accountId = chAccount.account_id
      pageId = chAccount.page_id
    }

    // Fallback to org.settings for old conversations without channel_account_id
    if (!accessToken) {
      const { data: org } = await supabase
        .from("organizations").select("settings").eq("id", auth.org_id).single()

      if (channel === "instagram") {
        accessToken = org?.settings?.instagram_page_token || null
        accountId = org?.settings?.instagram_account_id || null
      } else {
        accessToken = org?.settings?.facebook_page_token || null
        pageId = org?.settings?.facebook_page_id || null
      }
    }

    if (!accessToken) {
      return NextResponse.json({ detail: "Kanal hesabi bulunamadi" }, { status: 400 })
    }

    const tokenSource = channelAccountId ? "channel_accounts" : "org.settings"

    if (channel === "instagram") {
      const recipientId = conv.contact.wa_id?.replace("ig_", "")
      console.log("[OUTGOING][REQUEST]", { platform: "instagram", connectedAccountId: channelAccountId, recipientId, messageText: text })
      console.log("[OUTGOING][TOKEN]", { pageId, accountId, tokenSource })

      if (!pageId || !recipientId) {
        return NextResponse.json({ detail: "Instagram pageId veya recipientId eksik" }, { status: 400 })
      }

      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ recipient: { id: recipientId }, message: { text }, messaging_type: "RESPONSE" }),
        })
        const data = await res.json()
        console.log("[OUTGOING][META_RESPONSE]", { status: res.status, body: data })

        if (!res.ok || data.error) {
          await supabase.from("messages").insert({
            org_id: auth.org_id, conversation_id: conv.id, contact_id: conv.contact_id,
            wa_message_id: null, direction: "outbound", type: "text", content: { body: text },
            status: "failed", sender_type: "agent", sender_id: auth.sub,
          })
          return NextResponse.json(
            { detail: `Instagram gonderilemedi: ${data.error?.message || res.status}` },
            { status: 502 }
          )
        }

        waMessageId = data.message_id || null
      } catch (err: any) {
        console.error("[OUTGOING][ERROR]", { name: err.name, message: err.message, stack: err.stack })
        return NextResponse.json({ detail: "Instagram send network hatasi" }, { status: 502 })
      }
    } else {
      // facebook
      const recipientId = conv.contact.wa_id?.replace("fb_", "")
      console.log("[OUTGOING][REQUEST]", { platform: "facebook", connectedAccountId: channelAccountId, recipientId, messageText: text })
      console.log("[OUTGOING][TOKEN]", { accountName: pageId, tokenSource })

      if (!pageId || !recipientId) {
        return NextResponse.json({ detail: "Facebook pageId veya recipientId eksik" }, { status: 400 })
      }

      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ recipient: { id: recipientId }, message: { text }, messaging_type: "RESPONSE" }),
        })
        const data = await res.json()
        console.log("[OUTGOING][META_RESPONSE]", { status: res.status, body: data })

        if (!res.ok || data.error) {
          await supabase.from("messages").insert({
            org_id: auth.org_id, conversation_id: conv.id, contact_id: conv.contact_id,
            wa_message_id: null, direction: "outbound", type: "text", content: { body: text },
            status: "failed", sender_type: "agent", sender_id: auth.sub,
          })
          return NextResponse.json(
            { detail: `Facebook gonderilemedi: ${data.error?.message || res.status}` },
            { status: 502 }
          )
        }

        waMessageId = data.message_id || null
      } catch (err: any) {
        console.error("[OUTGOING][ERROR]", { name: err.name, message: err.message, stack: err.stack })
        return NextResponse.json({ detail: "Facebook send network hatasi" }, { status: 502 })
      }
    }
  } else {
    // WhatsApp ile gönder
    const { data: phone } = await supabase
      .from("phone_numbers")
      .select("*, waba:waba_accounts(*)")
      .eq("id", conv.phone_number_id)
      .eq("is_active", true)
      .single()

    if (!phone) {
      return NextResponse.json(
        { detail: "Bu kanal hesabı aktif değil. Lütfen Kanallar sayfasından aktif hesap seçin." },
        { status: 400 }
      )
    }

    let accessToken: string
    try {
      accessToken = decryptToken(phone.waba.access_token)
    } catch {
      accessToken = phone.waba.access_token
    }

    if (template_name) {
      const result = await sendTemplateMessage(
        phone.phone_number_id,
        accessToken,
        conv.contact.wa_id,
        template_name,
        language || "tr"
      )

      if (!result) {
        return NextResponse.json(
          { detail: "Template gönderilemedi: Meta API hatası" },
          { status: 502 }
        )
      }

      waMessageId = result.messages?.[0]?.id || null
    } else {
      const result = await sendTextMessage(
        phone.phone_number_id,
        accessToken,
        conv.contact.wa_id,
        text
      )

      if (!result.success) {
        console.error("[WhatsApp Send] Mesaj gonderilemedi:", {
          error: result.error,
          phoneNumberId: phone.phone_number_id,
          to: conv.contact.wa_id,
          convId: conv.id,
        })
        return NextResponse.json(
          { detail: `WhatsApp gonderilemedi: ${result.error}` },
          { status: 502 }
        )
      }

      waMessageId = result.messages?.[0]?.id || null
    }
  }

  // DB'ye kaydet
  const msgType = template_name ? "template" : "text"
  const msgBody = template_name ? (template_body || `[Şablon: ${template_name}]`) : text
  const { data: msg } = await supabase
    .from("messages")
    .insert({
      org_id: auth.org_id,
      conversation_id: conv.id,
      contact_id: conv.contact_id,
      wa_message_id: waMessageId,
      direction: "outbound",
      type: msgType,
      content: { body: msgBody },
      status: "sent",
      sender_type: "agent",
      sender_id: auth.sub,
    })
    .select()
    .single()

  // Conversation güncelle — bot devre dışı
  await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: msgBody.slice(0, 200),
      is_bot_active: false,
    })
    .eq("id", conv.id)

  return NextResponse.json({
    id: msg.id,
    conversation_id: msg.conversation_id,
    direction: msg.direction,
    type: msg.type,
    content: msg.content,
    status: msg.status,
    sender_type: msg.sender_type,
    created_at: msg.created_at,
  })
}
