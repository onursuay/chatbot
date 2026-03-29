import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

const GRAPH_API = "https://graph.facebook.com/v21.0"

// GET — Bağlı kanalları listele (multi-account)
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // WhatsApp — tüm WABA'lar ve telefon numaraları
  const { data: wabas } = await supabase
    .from("waba_accounts")
    .select("*, phone_numbers(*)")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)

  // Instagram & Facebook — channel_accounts tablosu
  const { data: channelAccounts } = await supabase
    .from("channel_accounts")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)

  const igAccounts = (channelAccounts || []).filter((a: any) => a.channel === "instagram")
  const fbAccounts = (channelAccounts || []).filter((a: any) => a.channel === "facebook")

  return NextResponse.json({
    connected: (wabas && wabas.length > 0),
    accounts: (wabas || []).map((w: any) => ({
      id: w.id,
      waba_id: w.waba_id,
      waba_name: w.name,
      business_id: w.business_id,
      phone_numbers: (w.phone_numbers || [])
        .filter((p: any) => p.is_active)
        .map((p: any) => ({
          id: p.phone_number_id,
          db_id: p.id,
          number: p.display_number,
          verified_name: p.verified_name,
          quality_rating: p.quality_rating,
          status: p.status,
        })),
    })),
    channel_accounts: (channelAccounts || []).map((ch: any) => ({
      id: ch.id,
      channel: ch.channel,
      account_id: ch.account_id,
      page_id: ch.page_id,
      page_name: ch.page_name,
      is_active: ch.is_active,
    })),
    // Legacy format for backward compatibility
    whatsapp: { connected: (wabas && wabas.length > 0) },
    instagram: { connected: igAccounts.length > 0, accounts: igAccounts },
    facebook: { connected: fbAccounts.length > 0, accounts: fbAccounts },
  })
}

// POST — Kanal bağla veya kes
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()
  const { channel, action } = body

  const supabase = getServiceSupabase()

  // === DISCONNECT SPECIFIC ACCOUNT ===
  if (action === "disconnect_account") {
    const { channel_account_id, waba_id } = body

    if (channel === "whatsapp" && waba_id) {
      await supabase.from("waba_accounts").update({ is_active: false }).eq("id", waba_id).eq("org_id", auth.org_id)
      await supabase.from("phone_numbers").update({ is_active: false }).eq("waba_id", waba_id).eq("org_id", auth.org_id)
      return NextResponse.json({ success: true })
    }

    if (channel_account_id) {
      await supabase.from("channel_accounts").update({ is_active: false }).eq("id", channel_account_id).eq("org_id", auth.org_id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ detail: "Hesap ID gerekli" }, { status: 400 })
  }

  // === DISCONNECT ALL (legacy) ===
  if (action === "disconnect") {
    if (channel === "whatsapp") {
      await supabase.from("waba_accounts").update({ is_active: false }).eq("org_id", auth.org_id)
      await supabase.from("phone_numbers").update({ is_active: false }).eq("org_id", auth.org_id)
    } else if (channel === "instagram" || channel === "facebook") {
      await supabase.from("channel_accounts").update({ is_active: false }).eq("org_id", auth.org_id).eq("channel", channel)
    }
    return NextResponse.json({ success: true })
  }

  // === CONNECT Instagram or Facebook — Portfolyo: TÜM sayfaları bağla ===
  // Tek sayfa bağlama (legacy): page_access_token + page_id
  // Portfolyo bağlama (yeni): pages dizisi [{page_id, page_access_token}]
  const { page_access_token, page_id, pages } = body

  if (!channel) {
    return NextResponse.json({ detail: "Kanal gerekli" }, { status: 400 })
  }

  // Portfolyo modu: birden fazla sayfa bağlama
  const pageList: { page_id: string; page_access_token: string }[] = pages
    ? pages
    : (page_access_token && page_id)
      ? [{ page_id, page_access_token }]
      : []

  if (!pageList.length) {
    return NextResponse.json({ detail: "Eksik parametreler" }, { status: 400 })
  }

  const connectedPages: any[] = []

  for (const pg of pageList) {
    const res = await fetch(`${GRAPH_API}/${pg.page_id}?fields=name,instagram_business_account&access_token=${pg.page_access_token}`)
    const pageData = await res.json()

    if (channel === "instagram") {
      const igAccountId = pageData.instagram_business_account?.id
      if (!igAccountId) continue // Bu sayfada IG hesabı yok, atla

      await fetch(`${GRAPH_API}/${pg.page_id}/subscribed_apps`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `subscribed_fields=messages,messaging_postbacks&access_token=${pg.page_access_token}`,
      })

      await supabase.from("channel_accounts").upsert({
        org_id: auth.org_id,
        channel: "instagram",
        account_id: igAccountId,
        page_id: pg.page_id,
        page_name: pageData.name || "Instagram",
        access_token: pg.page_access_token,
        is_active: true,
      }, { onConflict: "org_id,channel,account_id" })

      connectedPages.push({ account_id: igAccountId, page_name: pageData.name, channel: "instagram" })
    }

    if (channel === "facebook") {
      await fetch(`${GRAPH_API}/${pg.page_id}/subscribed_apps`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `subscribed_fields=messages,messaging_postbacks,feed&access_token=${pg.page_access_token}`,
      })

      await supabase.from("channel_accounts").upsert({
        org_id: auth.org_id,
        channel: "facebook",
        account_id: pg.page_id,
        page_id: pg.page_id,
        page_name: pageData.name || "Facebook Page",
        access_token: pg.page_access_token,
        is_active: true,
      }, { onConflict: "org_id,channel,account_id" })

      connectedPages.push({ account_id: pg.page_id, page_name: pageData.name, channel: "facebook" })
    }
  }

  // Backward compat: ilk sayfayı org settings'e kaydet
  if (connectedPages.length > 0) {
    const { data: org } = await supabase.from("organizations").select("settings").eq("id", auth.org_id).single()
    const settings = org?.settings || {}
    const first = connectedPages[0]
    if (channel === "instagram") {
      settings.instagram_page_name = first.page_name
    } else if (channel === "facebook") {
      settings.facebook_page_name = first.page_name
    }
    await supabase.from("organizations").update({ settings }).eq("id", auth.org_id)
  }

  return NextResponse.json({
    success: true,
    connected_count: connectedPages.length,
    pages: connectedPages,
    message: `${connectedPages.length} hesap başarıyla bağlandı`,
  })
}
