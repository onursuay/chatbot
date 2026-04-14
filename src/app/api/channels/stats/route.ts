import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // ── Bağlantı durumu ───────────────────────────────────────────────────────
  const [wabaResult, channelResult, metaResult] = await Promise.all([
    supabase.from("waba_accounts").select("id").eq("org_id", auth.org_id).eq("is_active", true),
    supabase.from("channel_accounts").select("channel, is_active").eq("org_id", auth.org_id),
    supabase.from("meta_connections").select("status, access_token, access_expires_at").eq("org_id", auth.org_id).maybeSingle(),
  ])

  const wabas = wabaResult.data || []
  const channelAccounts = channelResult.data || []
  const metaConnection = metaResult.data

  const metaConnected = !!(
    metaConnection?.access_token &&
    metaConnection.status === "active" &&
    (!metaConnection.access_expires_at || new Date(metaConnection.access_expires_at) >= new Date())
  )

  const waConnected =
    wabas.length > 0 ||
    channelAccounts.some((c: any) => c.channel === "whatsapp" && c.is_active) ||
    metaConnected

  const igConnected =
    channelAccounts.some((c: any) => c.channel === "instagram" && c.is_active) ||
    metaConnected

  const fbConnected =
    channelAccounts.some((c: any) => c.channel === "facebook" && c.is_active) ||
    metaConnected

  const messengerConnected =
    channelAccounts.some((c: any) => c.channel === "messenger" && c.is_active) ||
    fbConnected

  // Telegram ve WhatsApp Personal bağlantı durumu
  const tgConnected = channelAccounts.some((c: any) => c.channel === "telegram" && c.is_active)
  const waPersonalConnected = channelAccounts.some((c: any) => c.channel === "whatsapp_personal" && c.is_active)

  // ── Conversation ID'lerini channel bazında al ─────────────────────────────
  // messages.channel kolonu yok; conversations.channel üzerinden join yapıyoruz
  const { data: convsData } = await supabase
    .from("conversations")
    .select("id, channel")
    .eq("org_id", auth.org_id)

  const convs = convsData || []

  const channelConvIds: Record<string, string[]> = {
    whatsapp: convs.filter((c) => !c.channel || c.channel === "whatsapp").map((c) => c.id),
    instagram: convs.filter((c) => c.channel === "instagram").map((c) => c.id),
    facebook: convs.filter((c) => c.channel === "facebook").map((c) => c.id),
    messenger: convs.filter((c) => c.channel === "messenger").map((c) => c.id),
    telegram: convs.filter((c) => c.channel === "telegram").map((c) => c.id),
    whatsapp_personal: convs.filter((c) => c.channel === "whatsapp_personal").map((c) => c.id),
  }

  const countMsgs = async (ids: string[], direction: string): Promise<number> => {
    if (ids.length === 0) return 0
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", ids)
      .eq("direction", direction)
    return count || 0
  }

  // ── Mesaj sayıları ────────────────────────────────────────────────────────
  const [
    waSent, waReceived,
    igSent, igReceived,
    fbSent, fbReceived,
    msgSent, msgReceived,
    tgSent, tgReceived,
    wapSent, wapReceived,
  ] = await Promise.all([
    countMsgs(channelConvIds.whatsapp, "outbound"),
    countMsgs(channelConvIds.whatsapp, "inbound"),
    countMsgs(channelConvIds.instagram, "outbound"),
    countMsgs(channelConvIds.instagram, "inbound"),
    countMsgs(channelConvIds.facebook, "outbound"),
    countMsgs(channelConvIds.facebook, "inbound"),
    countMsgs(channelConvIds.messenger, "outbound"),
    countMsgs(channelConvIds.messenger, "inbound"),
    countMsgs(channelConvIds.telegram, "outbound"),
    countMsgs(channelConvIds.telegram, "inbound"),
    countMsgs(channelConvIds.whatsapp_personal, "outbound"),
    countMsgs(channelConvIds.whatsapp_personal, "inbound"),
  ])

  return NextResponse.json({
    whatsapp: { sent: waSent, received: waReceived, connected: waConnected },
    instagram: { sent: igSent, received: igReceived, connected: igConnected },
    facebook: { sent: fbSent, received: fbReceived, connected: fbConnected },
    messenger: { sent: msgSent, received: msgReceived, connected: messengerConnected },
    telegram: { sent: tgSent, received: tgReceived, connected: tgConnected },
    whatsapp_personal: { sent: wapSent, received: wapReceived, connected: waPersonalConnected },
  })
}
