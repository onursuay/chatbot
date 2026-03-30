import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

const GRAPH_API_VERSION = "v21.0"
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// POST — Save channel selection and subscribe to webhooks
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  try {
    const body = await request.json()
    const {
      channel,       // 'whatsapp' | 'instagram' | 'messenger'
      platform_id,   // phone_number_id, ig_user_id, or page_id
      platform_name, // display name
      platform_detail, // e.g. phone number or username
      metadata,      // additional data (waba_id, page_access_token, etc.)
      enabled,       // boolean
    } = body

    if (!channel || !platform_id) {
      return NextResponse.json(
        { detail: "channel ve platform_id zorunludur" },
        { status: 400 }
      )
    }

    const supabase = getServiceSupabase()

    // Get meta_connection for access token
    const { data: connection } = await supabase
      .from("meta_connections")
      .select("access_token")
      .eq("org_id", auth.org_id)
      .eq("status", "active")
      .maybeSingle()

    if (!connection) {
      return NextResponse.json(
        { detail: "Meta hesabi bagli degil" },
        { status: 400 }
      )
    }

    // Upsert channel selection
    const { data: selection, error: dbError } = await supabase
      .from("channel_selections")
      .upsert(
        {
          org_id: auth.org_id,
          channel,
          platform_id,
          platform_name: platform_name || null,
          platform_detail: platform_detail || null,
          metadata: metadata || {},
          enabled: enabled ?? true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_id,channel,platform_id" }
      )
      .select()
      .single()

    if (dbError) {
      console.error("channel_selections upsert error:", dbError)
      return NextResponse.json(
        { detail: "Kanal secimi kaydedilemedi" },
        { status: 500 }
      )
    }

    // Subscribe to webhooks if enabled
    let webhookResult: any = null
    if (enabled) {
      try {
        webhookResult = await subscribeWebhook(
          channel,
          platform_id,
          metadata,
          connection.access_token
        )
      } catch (whErr: any) {
        console.error("Webhook subscription error:", whErr)
        webhookResult = { error: whErr.message }
      }
    }

    return NextResponse.json({
      selection,
      webhook: webhookResult,
      message: "Kanal secimi kaydedildi",
    })
  } catch (e: any) {
    console.error("Channel select error:", e)
    return NextResponse.json(
      { detail: e.message || "Kanal secimi hatasi" },
      { status: 500 }
    )
  }
}

// DELETE — Remove a channel selection by id
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { detail: "id parametresi zorunludur" },
        { status: 400 }
      )
    }

    const supabase = getServiceSupabase()

    // Ensure the selection belongs to this org
    const { data: existing } = await supabase
      .from("channel_selections")
      .select("id, org_id")
      .eq("id", id)
      .eq("org_id", auth.org_id)
      .maybeSingle()

    if (!existing) {
      return NextResponse.json(
        { detail: "Secim bulunamadi" },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from("channel_selections")
      .delete()
      .eq("id", id)
      .eq("org_id", auth.org_id)

    if (error) {
      console.error("channel_selections delete error:", error)
      return NextResponse.json(
        { detail: "Secim silinemedi" },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: "Secim kaldirildi", id })
  } catch (e: any) {
    console.error("Channel delete error:", e)
    return NextResponse.json(
      { detail: e.message || "Silme hatasi" },
      { status: 500 }
    )
  }
}

async function subscribeWebhook(
  channel: string,
  platformId: string,
  metadata: any,
  accessToken: string
) {
  switch (channel) {
    case "whatsapp": {
      // Subscribe WABA to webhooks
      const wabaId = metadata?.waba_id || platformId
      const res = await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(
          `WhatsApp webhook subscription failed: ${JSON.stringify(data)}`
        )
      }
      return { success: true, platform: "whatsapp", data }
    }

    case "instagram": {
      // Subscribe page to Instagram messaging webhooks
      const pageId = metadata?.page_id || platformId
      const pageToken = metadata?.page_access_token || accessToken
      const res = await fetch(
        `${GRAPH_BASE}/${pageId}/subscribed_apps`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pageToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscribed_fields: ["messages"],
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(
          `Instagram webhook subscription failed: ${JSON.stringify(data)}`
        )
      }
      return { success: true, platform: "instagram", data }
    }

    case "messenger": {
      // Subscribe page to Messenger webhooks
      const pageId = metadata?.page_id || platformId
      const pageToken = metadata?.page_access_token || accessToken
      const res = await fetch(
        `${GRAPH_BASE}/${pageId}/subscribed_apps`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pageToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscribed_fields: ["messages", "messaging_postbacks"],
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(
          `Messenger webhook subscription failed: ${JSON.stringify(data)}`
        )
      }
      return { success: true, platform: "messenger", data }
    }

    default:
      return { success: false, error: `Bilinmeyen kanal: ${channel}` }
  }
}
