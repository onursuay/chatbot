import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

const GRAPH_API = "https://graph.facebook.com/v21.0"

// GET — Bağlı kanalları listele
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // WhatsApp durumu
  const { data: waba } = await supabase
    .from("waba_accounts")
    .select("waba_id")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)
    .single()

  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", auth.org_id)
    .single()

  const settings = org?.settings || {}

  return NextResponse.json({
    whatsapp: {
      connected: !!waba,
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

// POST — Kanal bağla veya kes
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()
  const { channel, action } = body

  const supabase = getServiceSupabase()

  // === DISCONNECT ===
  if (action === "disconnect") {
    if (channel === "whatsapp") {
      // WABA'yı deaktif et
      await supabase
        .from("waba_accounts")
        .update({ is_active: false })
        .eq("org_id", auth.org_id)

      // Phone numbers deaktif
      await supabase
        .from("phone_numbers")
        .update({ is_active: false })
        .eq("org_id", auth.org_id)

      return NextResponse.json({ success: true })
    }

    // Instagram veya Facebook disconnect
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", auth.org_id)
      .single()

    const settings = org?.settings || {}

    if (channel === "instagram") {
      delete settings.instagram_page_id
      delete settings.instagram_account_id
      delete settings.instagram_page_name
      delete settings.instagram_page_token
    } else if (channel === "facebook") {
      delete settings.facebook_page_id
      delete settings.facebook_page_name
      delete settings.facebook_page_token
    }

    await supabase
      .from("organizations")
      .update({ settings })
      .eq("id", auth.org_id)

    return NextResponse.json({ success: true })
  }

  // === CONNECT ===
  const { page_access_token, page_id } = body

  if (!channel || !page_access_token || !page_id) {
    return NextResponse.json({ detail: "Eksik parametreler" }, { status: 400 })
  }

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
      return NextResponse.json({ detail: "Bu sayfaya bağlı Instagram hesabı bulunamadı" }, { status: 400 })
    }

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
