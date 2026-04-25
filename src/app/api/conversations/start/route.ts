import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"
import { decryptToken } from "@/lib/crypto"
import { sendTextMessage } from "@/lib/whatsapp"

// POST — Yeni konuşma başlat (WhatsApp: telefon ile, diğer kanallar: mevcut contact ile)
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()
  const { phone, name, text, phone_number_id, channel_account_id } = body

  const supabase = getServiceSupabase()

  // ─── WhatsApp akışı ─────────────────────────────────────────────────────────
  if (phone_number_id) {
    if (!phone) {
      return NextResponse.json({ detail: "Telefon numarası zorunlu" }, { status: 400 })
    }

    // E.164 formatına normalize et
    const waId = phone.trim().replace(/\s+/g, "").replace(/^00/, "+")

    // Phone number + erişim token'ı al
    const { data: phoneRow } = await supabase
      .from("phone_numbers")
      .select("*, waba:waba_accounts(*)")
      .eq("phone_number_id", phone_number_id)
      .eq("org_id", auth.org_id)
      .eq("is_active", true)
      .single()

    if (!phoneRow) {
      return NextResponse.json({ detail: "WhatsApp numarası bulunamadı" }, { status: 404 })
    }

    // Contact bul veya oluştur
    let { data: contact } = await supabase
      .from("contacts")
      .select("*")
      .eq("org_id", auth.org_id)
      .eq("wa_id", waId)
      .single()

    if (!contact) {
      const { data: newContact, error: contactErr } = await supabase
        .from("contacts")
        .insert({ org_id: auth.org_id, wa_id: waId, phone: waId, name: name?.trim() || null })
        .select()
        .single()

      if (contactErr) {
        return NextResponse.json({ detail: contactErr.message }, { status: 500 })
      }
      contact = newContact
    } else if (name?.trim() && !contact.name) {
      await supabase.from("contacts").update({ name: name.trim() }).eq("id", contact.id)
    }

    // Konuşma bul veya oluştur
    let { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("org_id", auth.org_id)
      .eq("contact_id", contact.id)
      .eq("phone_number_id", phoneRow.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!conv) {
      const { data: newConv, error: convErr } = await supabase
        .from("conversations")
        .insert({
          org_id: auth.org_id,
          contact_id: contact.id,
          phone_number_id: phoneRow.id,
          channel: "whatsapp",
          status: "open",
          is_bot_active: false,
        })
        .select()
        .single()

      if (convErr) {
        return NextResponse.json({ detail: convErr.message }, { status: 500 })
      }
      conv = newConv
    }

    // Metin varsa gönder
    if (text?.trim()) {
      let accessToken: string
      try {
        accessToken = decryptToken(phoneRow.waba.access_token)
      } catch {
        accessToken = phoneRow.waba.access_token
      }

      const result = await sendTextMessage(
        phoneRow.phone_number_id,
        accessToken,
        waId,
        text.trim()
      )

      const msgBody = text.trim()
      await supabase.from("messages").insert({
        org_id: auth.org_id,
        conversation_id: conv.id,
        contact_id: contact.id,
        wa_message_id: result.messages?.[0]?.id || null,
        direction: "outbound",
        type: "text",
        content: { body: msgBody },
        status: result.success ? "sent" : "failed",
        sender_type: "agent",
        sender_id: auth.sub,
      })

      await supabase.from("conversations").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: msgBody.slice(0, 200),
        is_bot_active: false,
      }).eq("id", conv.id)

      if (!result.success) {
        return NextResponse.json(
          { detail: `Mesaj gönderilemedi: ${result.error}`, conversation_id: conv.id },
          { status: 207 }
        )
      }
    }

    return NextResponse.json({
      id: conv.id,
      contact_id: contact.id,
      contact_name: contact.name || null,
      contact_phone: contact.phone || null,
      channel: "whatsapp",
      status: conv.status,
      is_bot_active: conv.is_bot_active,
      last_message_at: conv.last_message_at,
      last_message_preview: conv.last_message_preview,
      unread_count: 0,
    })
  }

  return NextResponse.json({ detail: "Geçersiz istek" }, { status: 400 })
}
