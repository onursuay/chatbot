import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // Check connected channels
  const { data: wabas } = await supabase
    .from("waba_accounts")
    .select("id")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)

  const { data: channelAccounts } = await supabase
    .from("channel_accounts")
    .select("channel, is_active")
    .eq("org_id", auth.org_id)

  const igConnected = (channelAccounts || []).some((c: any) => c.channel === "instagram" && c.is_active)
  const fbConnected = (channelAccounts || []).some((c: any) => c.channel === "facebook" && c.is_active)
  const waConnected = (wabas || []).length > 0

  // Message counts from conversations
  const { count: waSent } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("org_id", auth.org_id)
    .eq("channel", "whatsapp")
    .eq("direction", "outbound")

  const { count: waReceived } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("org_id", auth.org_id)
    .eq("channel", "whatsapp")
    .eq("direction", "inbound")

  return NextResponse.json({
    whatsapp: { sent: waSent || 0, received: waReceived || 0, connected: waConnected },
    instagram: { sent: 0, received: 0, connected: igConnected },
    facebook: { sent: 0, received: 0, connected: fbConnected },
    messenger: { sent: 0, received: 0, connected: fbConnected },
  })
}
