import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const GRAPH_BASE = "https://graph.facebook.com/v21.0"

function maskSecret(val: string | null | undefined): string {
  if (!val) return "(empty)"
  if (val.length <= 10) return "***"
  return val.slice(0, 6) + "..." + val.slice(-4)
}

// GET — Meta webhook durumunu debug et
// GECICi ENDPOINT — sorun çözülünce kaldırılacak
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get("secret")

  // Basit koruma — URL'de secret=debug2026 olmalı
  if (secret !== "debug2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  // 1. ENV durumu
  const envStatus = {
    META_APP_ID: process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID || "(NOT SET)",
    META_APP_SECRET: maskSecret(process.env.META_APP_SECRET),
    META_WEBHOOK_VERIFY_TOKEN: maskSecret(process.env.META_WEBHOOK_VERIFY_TOKEN || "waapi_webhook_verify_2026"),
    META_REDIRECT_URI: process.env.META_REDIRECT_URI || "(NOT SET)",
    META_CONFIG_ID: process.env.META_CONFIG_ID || "(NOT SET)",
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV || "(not vercel)",
    VERCEL_URL: process.env.VERCEL_URL || "(not set)",
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL || "(not set)",
  }

  // 2. Tüm meta_connections
  const { data: connections } = await supabase
    .from("meta_connections")
    .select("org_id, status, scopes, access_expires_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(10)

  // 3. Tüm channel_accounts
  const { data: channelAccounts } = await supabase
    .from("channel_accounts")
    .select("id, org_id, channel, account_id, page_id, page_name, is_active, access_token, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20)

  const maskedAccounts = (channelAccounts || []).map((ca: any) => ({
    ...ca,
    access_token: maskSecret(ca.access_token),
  }))

  // 4. Tüm channel_selections
  const { data: selections } = await supabase
    .from("channel_selections")
    .select("id, org_id, channel, platform_id, platform_name, enabled, metadata, updated_at")
    .order("updated_at", { ascending: false })
    .limit(20)

  // 5. Active connection varsa page subscription durumunu kontrol et
  let pageSubscriptions: any[] = []
  for (const conn of connections || []) {
    if (conn.status !== "active") continue
    const { data: fullConn } = await supabase
      .from("meta_connections")
      .select("access_token")
      .eq("org_id", conn.org_id)
      .single()
    if (!fullConn?.access_token) continue

    // Instagram channel_accounts bul
    const igAccounts = (channelAccounts || []).filter(
      (ca: any) => ca.org_id === conn.org_id && ca.channel === "instagram" && ca.is_active
    )

    for (const ig of igAccounts) {
      const pageId = ig.page_id || ig.account_id
      try {
        // Page subscription durumunu kontrol et
        const token = ig.access_token || fullConn.access_token
        const subRes = await fetch(`${GRAPH_BASE}/${pageId}/subscribed_apps`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const subData = await subRes.json()
        pageSubscriptions.push({
          org_id: conn.org_id,
          page_id: pageId,
          ig_account_id: ig.account_id,
          subscription: subData,
        })
      } catch (e: any) {
        pageSubscriptions.push({
          org_id: conn.org_id,
          page_id: pageId,
          ig_account_id: ig.account_id,
          error: e.message,
        })
      }
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    env: envStatus,
    meta_connections: connections,
    channel_accounts: maskedAccounts,
    channel_selections: selections,
    page_subscriptions: pageSubscriptions,
    notes: [
      "Bu endpoint GECICi debug icin eklendi — sorun cozulunce kaldirilacak",
      "Webhook route'ta export const dynamic = 'force-dynamic' eklendi",
      "Instagram subscription fields: messages, messaging_postbacks, feed",
    ],
  }, { status: 200 })
}
