import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID || ""
const META_APP_SECRET = process.env.META_APP_SECRET || ""
const GRAPH_API_VERSION = "v21.0"
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

const EMPTY = {
  whatsapp: [] as any[],
  instagram: [] as any[],
  pages: [] as any[],
  selections: [] as any[],
  activeSelections: {} as Record<string, any[]>,
  connected: false,
}

// GET — List available channel assets
// Source of truth: ONLY the active meta_connection token + Meta Graph API.
// Legacy DB tables (waba_accounts, channel_accounts) are never used as an asset source.
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // 1. Load active meta connection FIRST — all asset listing derives from this
  const { data: connection } = await supabase
    .from("meta_connections")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("status", "active")
    .maybeSingle()

  if (!connection?.access_token) {
    console.log("[AVAILABLE] no active meta connection for org:", auth.org_id)
    return NextResponse.json({ ...EMPTY, source: "none" })
  }

  // Check token expiry using the correct column name
  const expiresAt = connection.expires_at || connection.access_expires_at
  if (expiresAt && new Date(expiresAt) < new Date()) {
    console.log("[AVAILABLE] meta connection token expired for org:", auth.org_id)
    return NextResponse.json({ ...EMPTY, source: "expired" })
  }

  // 2. Resolve current Meta account identity for isolation enforcement
  let metaUserId: string | null = connection.meta_user_id || null
  if (!metaUserId) {
    try {
      const meRes = await fetch(`${GRAPH_BASE}/me?fields=id`, {
        headers: { Authorization: `Bearer ${connection.access_token}` },
      })
      const meData = await meRes.json()
      metaUserId = meData.id || null
    } catch (e) {
      console.error("[AVAILABLE] failed to resolve meta user id:", e)
    }
  }
  console.log("[AVAILABLE] active meta_user_id:", metaUserId, "org:", auth.org_id)

  // 3. Fetch assets from Graph API — ONLY source of truth, no DB fallback
  let whatsapp: any[] = []
  let pages: any[] = []
  let instagram: any[] = []
  let graphError: string | null = null

  const [waResult, pgResult] = await Promise.allSettled([
    fetchWhatsAppAccounts(connection.access_token),
    fetchPagesAndInstagram(connection.access_token),
  ])

  if (waResult.status === "fulfilled") {
    whatsapp = waResult.value
  } else {
    console.error("[AVAILABLE] whatsapp fetch failed:", waResult.reason)
    graphError = "whatsapp_fetch_failed"
  }

  if (pgResult.status === "fulfilled") {
    pages = pgResult.value.pages
    instagram = pgResult.value.instagram
  } else {
    console.error("[AVAILABLE] pages/instagram fetch failed:", pgResult.reason)
    graphError = graphError || "pages_fetch_failed"
  }

  // WhatsApp DB fallback: if Graph API returned nothing (no Business Manager),
  // fall back to waba_accounts saved via Embedded Signup.
  if (whatsapp.length === 0) {
    const { data: wabaRows } = await supabase
      .from("waba_accounts")
      .select("id, waba_id, name, business_id, phone_numbers(*)")
      .eq("org_id", auth.org_id)
      .eq("is_active", true)
    if (wabaRows && wabaRows.length > 0) {
      console.log("[AVAILABLE] graph api returned no whatsapp — using waba_accounts fallback, count:", wabaRows.length)
      whatsapp = wabaRows.map((w: any) => ({
        business_id: w.business_id || "",
        business_name: "",
        waba_id: w.waba_id,
        waba_name: w.name || w.waba_id,
        phone_numbers: (w.phone_numbers || []).map((p: any) => ({
          id: p.phone_number_id || p.id,
          display_phone_number: p.display_number || p.number || "",
          verified_name: p.verified_name || "",
          quality_rating: p.quality_rating || "UNKNOWN",
        })),
        source: "waba_accounts",
      }))
    } else {
      console.log("[AVAILABLE] whatsapp empty: no graph api results and no waba_accounts in DB")
    }
  }

  // Log all fetched asset IDs from Graph API
  const fetchedPhoneIds = whatsapp.flatMap((w: any) => w.phone_numbers.map((p: any) => p.id))
  const fetchedWabaIds = whatsapp.map((w: any) => w.waba_id)
  const fetchedIgIds = instagram.map((ig: any) => ig.id)
  const fetchedPageIds = pages.map((p: any) => p.id)

  console.log("[AVAILABLE] fetched waba_ids:", fetchedWabaIds)
  console.log("[AVAILABLE] fetched phone_ids:", fetchedPhoneIds)
  console.log("[AVAILABLE] fetched ig_ids:", fetchedIgIds)
  console.log("[AVAILABLE] fetched page_ids:", fetchedPageIds)

  // 4. Load channel_selections and filter strictly against live asset IDs.
  //    Any selection whose platform_id is not in the current account's live data is dropped.
  const { data: selectionsData } = await supabase
    .from("channel_selections")
    .select("*")
    .eq("org_id", auth.org_id)

  const allSelections = selectionsData || []

  const livePhoneIds = new Set(fetchedPhoneIds)
  const liveIgIds = new Set(fetchedIgIds)
  const livePageIds = new Set(fetchedPageIds)

  const activeSelections: Record<string, any[]> = {}
  const droppedIds: string[] = []
  const liveSelections: any[] = []

  for (const sel of allSelections) {
    const isLive =
      (sel.channel === "whatsapp" && livePhoneIds.has(sel.platform_id)) ||
      (sel.channel === "instagram" && liveIgIds.has(sel.platform_id)) ||
      (sel.channel === "messenger" && livePageIds.has(sel.platform_id))

    if (!isLive) {
      droppedIds.push(`${sel.channel}:${sel.platform_id}`)
      continue
    }

    liveSelections.push(sel)

    if (sel.enabled) {
      if (!activeSelections[sel.channel]) activeSelections[sel.channel] = []
      activeSelections[sel.channel].push(sel)
    }
  }

  if (droppedIds.length > 0) {
    console.log("[AVAILABLE] dropped stale asset ids (not in current account):", droppedIds)
  }

  // Log rendered/persisted asset IDs
  const renderedPhoneIds = (activeSelections.whatsapp || []).map((s: any) => s.platform_id)
  const renderedIgIds = (activeSelections.instagram || []).map((s: any) => s.platform_id)
  const renderedPageIds = (activeSelections.messenger || []).map((s: any) => s.platform_id)
  console.log("[AVAILABLE] rendered phone_ids:", renderedPhoneIds)
  console.log("[AVAILABLE] rendered ig_ids:", renderedIgIds)
  console.log("[AVAILABLE] rendered page_ids:", renderedPageIds)

  // Log messenger empty state reason
  if (fetchedPageIds.length === 0) {
    console.log("[AVAILABLE] messenger empty reason: no pages returned from graph api")
  } else if (fetchedPageIds.length > 0 && (activeSelections.messenger || []).length === 0) {
    console.log("[AVAILABLE] messenger: pages available but none selected yet, count:", fetchedPageIds.length)
  }

  return NextResponse.json({
    whatsapp,
    instagram,
    pages,
    selections: liveSelections,
    activeSelections,
    connected: true,
    source: "meta_connections",
    meta_user_id: metaUserId,
    graph_error: graphError || null,
  })
}

// WhatsApp: /me/businesses -> WABAs -> phone_numbers
async function fetchWhatsAppAccounts(accessToken: string) {
  if (META_APP_ID && META_APP_SECRET) {
    try {
      const debugRes = await fetch(
        `${GRAPH_BASE}/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`
      )
      const debugData = await debugRes.json()
      const scopes = debugData.data?.granular_scopes || []
      const whatsappScope = scopes.find((scope: any) => scope.scope === "whatsapp_business_management")
      const targetIds: string[] = whatsappScope?.target_ids || []

      if (targetIds.length > 0) {
        const results: any[] = []

        for (const wabaId of targetIds) {
          const [wabaRes, phoneRes] = await Promise.all([
            fetch(
              `${GRAPH_BASE}/${wabaId}?fields=id,name,currency,timezone_id`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            ),
            fetch(
              `${GRAPH_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            ),
          ])

          const wabaData = await wabaRes.json()
          const phoneData = await phoneRes.json()

          results.push({
            business_id: "",
            business_name: "",
            waba_id: wabaData.id || wabaId,
            waba_name: wabaData.name || wabaId,
            phone_numbers: (phoneData.data || []).map((p: any) => ({
              id: p.id,
              display_phone_number: p.display_phone_number,
              verified_name: p.verified_name,
              quality_rating: p.quality_rating,
            })),
          })
        }

        return results
      }
    } catch (e) {
      console.error("[AVAILABLE] debug_token whatsapp scope lookup failed:", e)
    }
  }

  const bizRes = await fetch(
    `${GRAPH_BASE}/me/businesses?fields=id,name`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const bizData = await bizRes.json()

  if (!bizData.data || bizData.data.length === 0) return []

  const results: any[] = []

  for (const biz of bizData.data) {
    const wabaRes = await fetch(
      `${GRAPH_BASE}/${biz.id}/owned_whatsapp_business_accounts?fields=id,name,currency,timezone_id`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const wabaData = await wabaRes.json()

    for (const waba of wabaData.data || []) {
      const phoneRes = await fetch(
        `${GRAPH_BASE}/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const phoneData = await phoneRes.json()

      results.push({
        business_id: biz.id,
        business_name: biz.name,
        waba_id: waba.id,
        waba_name: waba.name,
        phone_numbers: (phoneData.data || []).map((p: any) => ({
          id: p.id,
          display_phone_number: p.display_phone_number,
          verified_name: p.verified_name,
          quality_rating: p.quality_rating,
        })),
      })
    }
  }

  return results
}

// Pages + Instagram: /me/accounts with instagram expansion
async function fetchPagesAndInstagram(accessToken: string) {
  const res = await fetch(
    `${GRAPH_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,name,username,profile_picture_url}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()

  const pages: any[] = []
  const instagram: any[] = []

  for (const page of data.data || []) {
    pages.push({
      id: page.id,
      name: page.name,
      access_token: page.access_token,
    })

    if (page.instagram_business_account) {
      const ig = page.instagram_business_account
      instagram.push({
        id: ig.id,
        name: ig.name || ig.username,
        username: ig.username,
        profile_picture_url: ig.profile_picture_url,
        page_id: page.id,
        page_name: page.name,
        page_access_token: page.access_token,
      })
    }
  }

  return { pages, instagram }
}
