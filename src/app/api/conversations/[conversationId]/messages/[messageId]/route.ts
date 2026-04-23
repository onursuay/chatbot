import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

async function verifyConv(convId: string, orgId: string) {
  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", convId)
    .eq("org_id", orgId)
    .single()
  return data
}

// PATCH — Mesaj içeriğini düzenle
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { conversationId, messageId } = await params
  const { text } = await request.json()

  if (!text?.trim()) {
    return NextResponse.json({ detail: "Mesaj metni boş olamaz" }, { status: 400 })
  }

  const conv = await verifyConv(conversationId, auth.org_id)
  if (!conv) return NextResponse.json({ detail: "Konuşma bulunamadı" }, { status: 404 })

  const supabase = getServiceSupabase()

  const { data: msg } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .single()

  if (!msg) return NextResponse.json({ detail: "Mesaj bulunamadı" }, { status: 404 })

  const { data: updated, error } = await supabase
    .from("messages")
    .update({ content: { ...msg.content, body: text.trim(), is_edited: true } })
    .eq("id", messageId)
    .select()
    .single()

  if (error) return NextResponse.json({ detail: "Mesaj güncellenemedi" }, { status: 500 })

  return NextResponse.json({
    id: updated.id,
    conversation_id: updated.conversation_id,
    direction: updated.direction,
    type: updated.type,
    content: updated.content,
    status: updated.status,
    sender_type: updated.sender_type,
    created_at: updated.created_at,
  })
}

// DELETE — Mesajı sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { conversationId, messageId } = await params

  const conv = await verifyConv(conversationId, auth.org_id)
  if (!conv) return NextResponse.json({ detail: "Konuşma bulunamadı" }, { status: 404 })

  const supabase = getServiceSupabase()

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("conversation_id", conversationId)

  if (error) return NextResponse.json({ detail: "Mesaj silinemedi" }, { status: 500 })

  return NextResponse.json({ success: true })
}
