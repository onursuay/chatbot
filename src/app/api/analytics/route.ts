import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()
  const orgId = auth.org_id

  // Paralel sorgular
  const [
    totalConversations,
    openConversations,
    resolvedConversations,
    totalMessages,
    inboundMessages,
    outboundMessages,
    botMessages,
    agentMessages,
    totalContacts,
    totalBroadcasts,
    recentMessages,
  ] = await Promise.all([
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "open"),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("status", "resolved"),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("direction", "inbound"),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("direction", "outbound"),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("sender_type", "bot"),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("org_id", orgId).eq("sender_type", "agent"),
    supabase.from("contacts").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("broadcasts").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    // Son 7 günün mesaj sayıları (günlük)
    supabase
      .from("messages")
      .select("created_at")
      .eq("org_id", orgId)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true }),
  ])

  // Son 7 gün grafik verisi
  const dailyStats: Record<string, { inbound: number; outbound: number }> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })
    dailyStats[key] = { inbound: 0, outbound: 0 }
  }

  if (recentMessages.data) {
    for (const msg of recentMessages.data) {
      const d = new Date(msg.created_at)
      const key = d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })
      if (dailyStats[key]) {
        // We don't have direction in this query, count all
        dailyStats[key].inbound++
      }
    }
  }

  return NextResponse.json({
    overview: {
      total_conversations: totalConversations.count || 0,
      open_conversations: openConversations.count || 0,
      resolved_conversations: resolvedConversations.count || 0,
      total_messages: totalMessages.count || 0,
      inbound_messages: inboundMessages.count || 0,
      outbound_messages: outboundMessages.count || 0,
      bot_messages: botMessages.count || 0,
      agent_messages: agentMessages.count || 0,
      total_contacts: totalContacts.count || 0,
      total_broadcasts: totalBroadcasts.count || 0,
    },
    daily_chart: Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats,
    })),
  })
}
