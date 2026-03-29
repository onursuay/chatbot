import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// PATCH — Konuşma durumunu güncelle
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { conversationId } = await params
  const body = await request.json()

  const supabase = getServiceSupabase()

  // Konuşma org'a ait mi
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("org_id", auth.org_id)
    .single()

  if (!conv) {
    return NextResponse.json({ detail: "Konusma bulunamadi" }, { status: 404 })
  }

  const update: any = {}
  if (body.status !== undefined) update.status = body.status
  if (body.assigned_to !== undefined) update.assigned_to = body.assigned_to || null
  if (body.labels !== undefined) update.labels = body.labels
  if (body.is_bot_active !== undefined) update.is_bot_active = body.is_bot_active

  await supabase.from("conversations").update(update).eq("id", conversationId)

  return NextResponse.json({ status: "updated" })
}
