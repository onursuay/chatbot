import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// DELETE — Konuşmayı ve mesajlarını kalıcı olarak sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { conversationId } = await params
  const supabase = getServiceSupabase()

  // Konuşma org'a ait mi kontrol et
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("org_id", auth.org_id)
    .single()

  if (!conv) {
    return NextResponse.json({ detail: "Konusma bulunamadi" }, { status: 404 })
  }

  // Önce mesajları sil
  await supabase.from("messages").delete().eq("conversation_id", conversationId)

  // Sonra konuşmayı sil
  await supabase.from("conversations").delete().eq("id", conversationId)

  return NextResponse.json({ status: "deleted" })
}
