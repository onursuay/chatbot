import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { cookies } from "next/headers"

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID || ""
const META_APP_SECRET = process.env.META_APP_SECRET || ""
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || ""
const GRAPH_API_VERSION = "v21.0"
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// GET — Handle Meta OAuth callback
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")
  const errorDescription = searchParams.get("error_description")

  // User denied or error from Meta
  if (error) {
    console.error("Meta OAuth error:", error, errorDescription)
    return NextResponse.redirect(
      new URL(`/channels?error=${encodeURIComponent(errorDescription || error)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/channels?error=missing_params", request.url)
    )
  }

  // Validate CSRF state
  const cookieStore = await cookies()
  const storedState = cookieStore.get("meta_oauth_state")?.value
  const orgId = cookieStore.get("meta_oauth_org_id")?.value
  const lang = cookieStore.get("meta_oauth_lang")?.value || "tr"

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(
      new URL("/channels?error=invalid_state", request.url)
    )
  }

  if (!orgId) {
    return NextResponse.redirect(
      new URL("/channels?error=missing_org", request.url)
    )
  }

  try {
    // 1. Exchange code for short-lived token
    const shortTokenRes = await fetch(
      `${GRAPH_BASE}/oauth/access_token?` +
        new URLSearchParams({
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          redirect_uri: META_REDIRECT_URI,
          code,
        }).toString()
    )
    const shortTokenData = await shortTokenRes.json()

    if (!shortTokenData.access_token) {
      console.error("Short-lived token exchange failed:", shortTokenData)
      return NextResponse.redirect(
        new URL("/channels?error=token_exchange_failed", request.url)
      )
    }

    // 2. Exchange short-lived for long-lived token (~60 days)
    const longTokenRes = await fetch(
      `${GRAPH_BASE}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: META_APP_ID,
          client_secret: META_APP_SECRET,
          fb_exchange_token: shortTokenData.access_token,
        }).toString()
    )
    const longTokenData = await longTokenRes.json()

    if (!longTokenData.access_token) {
      console.error("Long-lived token exchange failed:", longTokenData)
      return NextResponse.redirect(
        new URL("/channels?error=long_token_failed", request.url)
      )
    }

    const accessToken = longTokenData.access_token
    // expires_in is in seconds, typically ~5184000 (60 days)
    const expiresIn = longTokenData.expires_in || 5184000
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    // 3. Get Meta user identity — required for account isolation enforcement
    const meRes = await fetch(`${GRAPH_BASE}/me?fields=id,name`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const meData = await meRes.json()
    const metaUserId: string | null = meData.id || null
    const metaUserName: string | null = meData.name || null
    console.log("[CALLBACK] meta_user_id:", metaUserId, "name:", metaUserName, "org:", orgId)

    // 4. Get granted scopes via debug_token
    const debugRes = await fetch(
      `${GRAPH_BASE}/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`
    )
    const debugData = await debugRes.json()
    const scopesArray: string[] = debugData.data?.scopes || []
    const scopesStr = scopesArray.join(",")
    console.log("[CALLBACK] granted scopes:", scopesStr || "(none)")

    // 5. Upsert into meta_connections
    const supabase = getServiceSupabase()
    console.log("[CALLBACK] upserting meta_connections for org:", orgId, "expiresAt:", expiresAt, "scopes:", scopesStr)
    const { data: upsertData, error: dbError } = await supabase
      .from("meta_connections")
      .upsert(
        {
          org_id: orgId,
          access_token: accessToken,
          access_expires_at: expiresAt,
          scopes: scopesStr,
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id" }
      )
      .select()

    console.log("[CALLBACK] upsert result:", upsertData, "error:", dbError?.message || null)

    if (dbError) {
      console.error("meta_connections upsert error:", dbError)
      return NextResponse.redirect(
        new URL("/channels?error=db_save_failed", request.url)
      )
    }

    // 6. Clear all stale channel data on reconnect.
    // Nullify phone_number_id FK references first to avoid constraint violations.
    await Promise.all([
      supabase.from("conversations").update({ phone_number_id: null }).eq("org_id", orgId),
      supabase.from("broadcasts").update({ phone_number_id: null }).eq("org_id", orgId),
    ])

    await Promise.all([
      supabase.from("channel_selections").delete().eq("org_id", orgId),
      supabase.from("channel_accounts").delete().eq("org_id", orgId),
      supabase.from("phone_numbers").delete().eq("org_id", orgId),
      supabase.from("waba_accounts").delete().eq("org_id", orgId),
    ])

    // 7. Clear OAuth cookies and redirect
    const response = NextResponse.redirect(
      new URL(`/${lang}/channels?connected=true`, request.url)
    )
    response.cookies.delete("meta_oauth_state")
    response.cookies.delete("meta_oauth_org_id")
    response.cookies.delete("meta_oauth_lang")

    return response
  } catch (e: any) {
    console.error("Meta OAuth callback error:", e)
    return NextResponse.redirect(
      new URL(`/${lang}/channels?error=${encodeURIComponent(e.message || "callback_error")}`, request.url)
    )
  }
}
