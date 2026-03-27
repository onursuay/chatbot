import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"
import { sendTextMessage } from "@/lib/whatsapp"

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
  const { text } = await request.json()

  if (!text) {
    return NextResponse.json({ detail: "Mesaj metni zorunlu" }, { status: 400 })
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

  // Phone number + WABA token
  const { data: phone } = await supabase
    .from("phone_numbers")
    .select("*, waba:waba_accounts(*)")
    .eq("id", conv.phone_number_id)
    .single()

  if (!phone) {
    return NextResponse.json({ detail: "Telefon numarasi bulunamadi" }, { status: 400 })
  }

  // WhatsApp'a gönder
  const result = await sendTextMessage(
    phone.phone_number_id,
    phone.waba.access_token,
    conv.contact.wa_id,
    text
  )

  const waMessageId = result?.messages?.[0]?.id || null

  // DB'ye kaydet
  const { data: msg } = await supabase
    .from("messages")
    .insert({
      org_id: auth.org_id,
      conversation_id: conv.id,
      contact_id: conv.contact_id,
      wa_message_id: waMessageId,
      direction: "outbound",
      type: "text",
      content: { body: text },
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
      last_message_preview: text.slice(0, 200),
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
