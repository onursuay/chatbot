import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const [activeConvsResult, totalContactsResult, sentMsgsResult, unreadConvsResult] = await Promise.all([
    // Aktif konuşmalar (open + assigned)
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.org_id)
      .in("status", ["open", "assigned"]),

    // Toplam kişi
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.org_id),

    // Gönderilen mesajlar (outbound)
    supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.org_id)
      .eq("direction", "outbound"),

    // Okunmamış konuşmalar
    supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.org_id)
      .gt("unread_count", 0),
  ])

  return NextResponse.json({
    active_conversations: activeConvsResult.count ?? 0,
    total_contacts: totalContactsResult.count ?? 0,
    sent_messages: sentMsgsResult.count ?? 0,
    unread_conversations: unreadConvsResult.count ?? 0,
  })
}
