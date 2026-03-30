import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

const GRAPH_API_VERSION = "v21.0"
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// GET — List available channel assets
// Supports both new (meta_connections + Graph API) and legacy (waba_accounts + channel_accounts) systems
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // Always fetch current selections
  const { data: selectionsData } = await supabase
    .from("channel_selections")
    .select("*")
    .eq("org_id", auth.org_id)

  const selections = selectionsData || []

  // Compute active selections per channel (multi-account)
  const activeSelections: Record<string, any[]> = {}
  for (const sel of selections) {
    if (sel.enabled) {
      if (!activeSelections[sel.channel]) activeSelections[sel.channel] = []
      activeSelections[sel.channel].push(sel)
    }
  }

  // 1. Try new meta_connections first
  const { data: connection } = await supabase
    .from("meta_connections")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("status", "active")
    .maybeSingle()

  if (connection?.access_token) {
    // Check expiry
    if (connection.access_expires_at && new Date(connection.access_expires_at) < new Date()) {
      // Token expired, fall through to legacy
    } else {
      // Use Graph API to get fresh data
      try {
        const [whatsappResult, pagesResult] = await Promise.allSettled([
          fetchWhatsAppAccounts(connection.access_token),
          fetchPagesAndInstagram(connection.access_token),
        ])

        const whatsapp = whatsappResult.status === "fulfilled" ? whatsappResult.value : []
        const pagesData = pagesResult.status === "fulfilled" ? pagesResult.value : { pages: [], instagram: [] }

        return NextResponse.json({
          whatsapp,
          instagram: pagesData.instagram,
          pages: pagesData.pages,
          selections,
          activeSelections,
          connected: true,
          source: "meta_connections",
        })
      } catch (e: any) {
        console.error("Graph API error, falling back to legacy:", e)
        // Fall through to legacy
      }
    }
  }

  // 2. Legacy fallback: Read from waba_accounts + channel_accounts in DB
  const [wabaResult, channelResult] = await Promise.all([
    supabase
      .from("waba_accounts")
      .select("id, waba_id, name, business_id, phone_numbers(*)")
      .eq("org_id", auth.org_id),
    supabase
      .from("channel_accounts")
      .select("*")
      .eq("org_id", auth.org_id),
  ])

  const wabaAccounts = wabaResult.data || []
  const channelAccounts = channelResult.data || []

  // Transform waba_accounts to the same format
  const whatsapp = wabaAccounts.map((waba: any) => ({
    business_id: waba.business_id || "",
    business_name: "",
    waba_id: waba.waba_id,
    waba_name: waba.name || waba.waba_id,
    phone_numbers: (waba.phone_numbers || []).map((p: any) => ({
      id: p.phone_number_id || p.id,
      display_phone_number: p.display_number || p.number || "",
      verified_name: p.verified_name || "",
      quality_rating: p.quality_rating || "UNKNOWN",
    })),
  }))

  // Transform channel_accounts to instagram/pages format
  const instagram = channelAccounts
    .filter((a: any) => a.channel === "instagram")
    .map((a: any) => ({
      id: a.account_id,
      name: a.page_name || a.account_id,
      username: "",
      page_id: a.page_id,
      page_name: a.page_name,
    }))

  const pages = channelAccounts
    .filter((a: any) => a.channel === "facebook")
    .map((a: any) => ({
      id: a.page_id || a.account_id,
      name: a.page_name || a.account_id,
      access_token: a.access_token || "",
    }))

  const hasData = whatsapp.length > 0 || instagram.length > 0 || pages.length > 0

  return NextResponse.json({
    whatsapp,
    instagram,
    pages,
    selections,
    activeSelections,
    connected: hasData,
    source: "legacy",
  })
}

// WhatsApp: /me/businesses -> WABAs -> phone_numbers
async function fetchWhatsAppAccounts(accessToken: string) {
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
