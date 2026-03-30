import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

const GRAPH_API_VERSION = "v21.0"
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// GET — List available channel assets from Meta
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // Get meta_connection for this org
  const { data: connection } = await supabase
    .from("meta_connections")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("status", "active")
    .maybeSingle()

  if (!connection) {
    return NextResponse.json({
      whatsapp: [],
      instagram: [],
      pages: [],
      connected: false,
      error: "Meta hesabi bagli degil",
    })
  }

  // Check if token is expired
  if (new Date(connection.expires_at) < new Date()) {
    return NextResponse.json({
      whatsapp: [],
      instagram: [],
      pages: [],
      connected: false,
      error: "token_expired",
    })
  }

  const accessToken = connection.access_token

  try {
    // Fetch all 3 in parallel + current selections from DB
    const [whatsappResult, pagesResult, selectionsResult] = await Promise.allSettled([
      fetchWhatsAppAccounts(accessToken),
      fetchPagesAndInstagram(accessToken),
      supabase
        .from("channel_selections")
        .select("*")
        .eq("org_id", auth.org_id),
    ])

    const whatsapp =
      whatsappResult.status === "fulfilled" ? whatsappResult.value : []
    const pagesData =
      pagesResult.status === "fulfilled" ? pagesResult.value : { pages: [], instagram: [] }
    const selections =
      selectionsResult.status === "fulfilled" && selectionsResult.value.data
        ? selectionsResult.value.data
        : []

    return NextResponse.json({
      whatsapp,
      instagram: pagesData.instagram,
      pages: pagesData.pages,
      selections,
      connected: true,
    })
  } catch (e: any) {
    console.error("Channels available error:", e)
    return NextResponse.json(
      { detail: e.message || "Kanal bilgileri alinamadi" },
      { status: 500 }
    )
  }
}

// WhatsApp: /me/businesses -> WABAs -> phone_numbers
async function fetchWhatsAppAccounts(accessToken: string) {
  const bizRes = await fetch(`${GRAPH_BASE}/me/businesses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
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
      })
    }
  }

  return { pages, instagram }
}
