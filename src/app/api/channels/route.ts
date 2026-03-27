import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

const GRAPH_API = "https://graph.facebook.com/v21.0"

// GET — Bağlı kanalları listele
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", auth.org_id)
    .single()

  const settings = org?.settings || {}

  return NextResponse.json({
    whatsapp: {
      connected: true, // zaten embedded signup ile bağlı
    },
    instagram: {
      connected: !!settings.instagram_page_id,
      page_id: settings.instagram_page_id || null,
      page_name: settings.instagram_page_name || null,
    },
    facebook: {
      connected: !!settings.facebook_page_id,
      page_id: settings.facebook_page_id || null,
      page_name: settings.facebook_page_name || null,
    },
  })
}

// POST — Instagram veya Facebook sayfası bağla
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { channel, page_access_token, page_id } = await request.json()

  if (!channel || !page_access_token || !page_id) {
    return NextResponse.json({ detail: "Eksik parametreler" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Sayfa bilgisini al
  const res = await fetch(`${GRAPH_API}/${page_id}?fields=name,instagram_business_account&access_token=${page_access_token}`)
  const pageData = await res.json()

  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", auth.org_id)
    .single()

  const settings = org?.settings || {}

  if (channel === "instagram") {
    const igAccountId = pageData.instagram_business_account?.id
    if (!igAccountId) {
      return NextResponse.json({ detail: "Bu sayfaya bagli Instagram hesabi bulunamadi" }, { status: 400 })
    }

    // Instagram webhook subscribe
    await fetch(`${GRAPH_API}/${page_id}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `subscribed_fields=messages,messaging_postbacks&access_token=${page_access_token}`,
    })

    settings.instagram_page_id = page_id
    settings.instagram_account_id = igAccountId
    settings.instagram_page_name = pageData.name
    settings.instagram_page_token = page_access_token
  } else if (channel === "facebook") {
    // Facebook Messenger webhook subscribe
    await fetch(`${GRAPH_API}/${page_id}/subscribed_apps`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `subscribed_fields=messages,messaging_postbacks,feed&access_token=${page_access_token}`,
    })

    settings.facebook_page_id = page_id
    settings.facebook_page_name = pageData.name
    settings.facebook_page_token = page_access_token
  }

  await supabase
    .from("organizations")
    .update({ settings })
    .eq("id", auth.org_id)

  return NextResponse.json({ success: true, page_name: pageData.name })
}
