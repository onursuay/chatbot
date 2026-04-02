import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

// GET — Check Meta connection status for this org
// Supports both new (meta_connections) and legacy (waba_accounts) systems
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // 1. Check new meta_connections table
  const { data: connection, error: connError } = await supabase
    .from("meta_connections")
    .select("status, access_token, access_expires_at, scopes, updated_at")
    .eq("org_id", auth.org_id)
    .maybeSingle()

  console.log("[meta/status] org:", auth.org_id, "connection:", connection ? "found" : "null", "error:", connError?.message || null)

  if (connection && connection.access_token) {
    const isExpired = connection.access_expires_at
      ? new Date(connection.access_expires_at) < new Date()
      : false
    const effectiveStatus = isExpired ? "expired" : connection.status

    return NextResponse.json({
      connected: effectiveStatus === "active",
      status: effectiveStatus,
      expires_at: connection.access_expires_at,
      scopes: connection.scopes ? (typeof connection.scopes === "string" ? connection.scopes.split(",") : connection.scopes) : [],
      updated_at: connection.updated_at,
      source: "meta_connections",
    })
  }

  // 2. Fallback: Check legacy waba_accounts (only active ones)
  const { data: wabaAccounts } = await supabase
    .from("waba_accounts")
    .select("id, waba_id, name, access_token")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)

  if (wabaAccounts && wabaAccounts.length > 0) {
    // Legacy connection exists
    return NextResponse.json({
      connected: true,
      status: "active",
      expires_at: null, // Legacy tokens don't have expiry tracked
      scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
      updated_at: null,
      source: "waba_accounts",
    })
  }

  // 3. Check channel_accounts for Instagram/Facebook
  const { data: channelAccounts } = await supabase
    .from("channel_accounts")
    .select("id")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)
    .limit(1)

  if (channelAccounts && channelAccounts.length > 0) {
    return NextResponse.json({
      connected: true,
      status: "active",
      expires_at: null,
      scopes: [],
      updated_at: null,
      source: "channel_accounts",
    })
  }

  return NextResponse.json({
    connected: false,
    status: null,
    expires_at: null,
    scopes: [],
  })
}
