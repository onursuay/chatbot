import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // Check connected channels from all sources (waba_accounts, channel_accounts, meta_connections)
  const [wabaResult, channelResult, metaResult] = await Promise.all([
    supabase
      .from("waba_accounts")
      .select("id")
      .eq("org_id", auth.org_id)
      .eq("is_active", true),
    supabase
      .from("channel_accounts")
      .select("channel, is_active")
      .eq("org_id", auth.org_id),
    supabase
      .from("meta_connections")
      .select("status, access_token, access_expires_at")
      .eq("org_id", auth.org_id)
      .maybeSingle(),
  ])

  const wabas = wabaResult.data || []
  const channelAccounts = channelResult.data || []
  const metaConnection = metaResult.data

  // Meta connection is active if token exists and not expired
  const metaConnected = !!(
    metaConnection?.access_token &&
    metaConnection.status === "active" &&
    (!metaConnection.access_expires_at || new Date(metaConnection.access_expires_at) >= new Date())
  )

  // WhatsApp: connected if waba_accounts OR channel_accounts(whatsapp) OR meta_connections
  const waConnected =
    wabas.length > 0 ||
    channelAccounts.some((c: any) => c.channel === "whatsapp" && c.is_active) ||
    metaConnected

  // Instagram: connected if channel_accounts(instagram) OR meta_connections
  const igConnected =
    channelAccounts.some((c: any) => c.channel === "instagram" && c.is_active) ||
    metaConnected

  // Facebook: connected if channel_accounts(facebook) OR meta_connections
  const fbConnected =
    channelAccounts.some((c: any) => c.channel === "facebook" && c.is_active) ||
    metaConnected

  // Messenger: connected if channel_accounts(messenger) OR facebook connected
  const messengerConnected =
    channelAccounts.some((c: any) => c.channel === "messenger" && c.is_active) ||
    fbConnected

  // Message counts from conversations for all channels
  const [waSentR, waReceivedR, igSentR, igReceivedR, fbSentR, fbReceivedR, msgSentR, msgReceivedR] =
    await Promise.all([
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("org_id", auth.org_id)
        .eq("channel", "whatsapp")
        .eq("direction", "outbound"),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("org_id", auth.org_id)
        .eq("channel", "whatsapp")
        .eq("direction", "inbound"),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("org_id", auth.org_id)
        .eq("channel", "instagram")
        .eq("direction", "outbound"),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("org_id", auth.org_id)
        .eq("channel", "instagram")
        .eq("direction", "inbound"),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("org_id", auth.org_id)
        .eq("channel", "facebook")
        .eq("direction", "outbound"),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("org_id", auth.org_id)
        .eq("channel", "facebook")
        .eq("direction", "inbound"),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("org_id", auth.org_id)
        .eq("channel", "messenger")
        .eq("direction", "outbound"),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("org_id", auth.org_id)
        .eq("channel", "messenger")
        .eq("direction", "inbound"),
    ])

  return NextResponse.json({
    whatsapp: { sent: waSentR.count || 0, received: waReceivedR.count || 0, connected: waConnected },
    instagram: { sent: igSentR.count || 0, received: igReceivedR.count || 0, connected: igConnected },
    facebook: { sent: fbSentR.count || 0, received: fbReceivedR.count || 0, connected: fbConnected },
    messenger: { sent: msgSentR.count || 0, received: msgReceivedR.count || 0, connected: messengerConnected },
  })
}
