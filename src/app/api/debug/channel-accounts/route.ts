import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// GET — channel_accounts ve ilgili tüm mapping verilerini döndür
// Kullanım: chatbot.yodijital.com/api/debug/channel-accounts
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // 1. channel_accounts
  const { data: channelAccounts } = await supabase
    .from("channel_accounts")
    .select("id, channel, account_id, page_id, page_name, is_active, created_at, updated_at")
    .eq("org_id", auth.org_id)
    .order("channel")

  // 2. channel_selections
  const { data: channelSelections } = await supabase
    .from("channel_selections")
    .select("id, channel, platform_id, platform_name, platform_detail, enabled, created_at")
    .eq("org_id", auth.org_id)
    .order("channel")

  // 3. conversations channel dağılımı
  const { data: convStats } = await supabase
    .from("conversations")
    .select("channel, channel_account_id")
    .eq("org_id", auth.org_id)

  const channelDist: Record<string, number> = {}
  for (const c of convStats || []) {
    const key = c.channel || "NULL"
    channelDist[key] = (channelDist[key] || 0) + 1
  }

  // 4. Token durumu (masked)
  const { data: channelAccountsWithToken } = await supabase
    .from("channel_accounts")
    .select("id, channel, account_id, page_id, access_token")
    .eq("org_id", auth.org_id)

  const tokenStatus = (channelAccountsWithToken || []).map((ca: any) => ({
    id: ca.id,
    channel: ca.channel,
    account_id: ca.account_id,
    page_id: ca.page_id,
    has_token: !!ca.access_token,
    token_prefix: ca.access_token ? ca.access_token.slice(0, 10) + "..." : null,
  }))

  return NextResponse.json({
    org_id: auth.org_id,
    channel_accounts: channelAccounts || [],
    channel_selections: channelSelections || [],
    token_status: tokenStatus,
    conversation_channel_distribution: channelDist,
    _note: "account_id = webhook'ta entry.id (object:instagram) veya recipient.id (object:page) ile eşleşmeli. page_id = webhook'ta entry.id (object:page) ile eşleşmeli.",
  })
}
