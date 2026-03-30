import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

const GRAPH_API_VERSION = "v21.0"
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

// POST — Save channel selection (multi-account-per-channel)
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  try {
    const body = await request.json()
    const {
      channel,
      platform_id,
      platform_name,
      platform_detail,
      metadata,
      enabled,
    } = body

    if (!channel || !platform_id) {
      return NextResponse.json({ detail: "channel ve platform_id zorunludur" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Get access token — try meta_connections first, then waba_accounts
    let accessToken: string | null = null

    const { data: connection } = await supabase
      .from("meta_connections")
      .select("access_token")
      .eq("org_id", auth.org_id)
      .eq("status", "active")
      .maybeSingle()

    if (connection?.access_token) {
      accessToken = connection.access_token
    } else {
      // Fallback: get token from waba_accounts (legacy Embedded Signup)
      const { data: waba } = await supabase
        .from("waba_accounts")
        .select("access_token")
        .eq("org_id", auth.org_id)
        .limit(1)
        .maybeSingle()

      if (waba?.access_token) {
        accessToken = waba.access_token
      }
    }

    // Note: accessToken can be null for IG/FB if using page-level tokens from metadata
    // So we don't block on missing accessToken anymore

    // MULTI-ACCOUNT: Upsert by (org_id, channel, platform_id) — don't delete others
    if (enabled) {
      const { data: selection, error: dbError } = await supabase
        .from("channel_selections")
        .upsert({
          org_id: auth.org_id,
          channel,
          platform_id,
          platform_name: platform_name || null,
          platform_detail: platform_detail || null,
          metadata: metadata || {},
          enabled: true,
        }, { onConflict: "org_id,channel,platform_id" })
        .select()
        .single()

      if (dbError) {
        console.error("channel_selections insert error:", dbError)
        return NextResponse.json({ detail: "Kanal secimi kaydedilemedi: " + dbError.message }, { status: 500 })
      }

      // Sync to runtime tables
      await syncRuntimeTables(supabase, auth.org_id, channel, platform_id, platform_name, metadata, true)

      // Subscribe to webhooks
      let webhookResult: any = null
      const whAccessToken = accessToken || metadata?.page_access_token
      if (whAccessToken) {
        try {
          webhookResult = await subscribeWebhook(channel, platform_id, metadata, whAccessToken)
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
    } else {
      // Disable: update existing selection to enabled=false
      const { error: updateError } = await supabase
        .from("channel_selections")
        .update({ enabled: false, updated_at: new Date().toISOString() })
        .eq("org_id", auth.org_id)
        .eq("channel", channel)
        .eq("platform_id", platform_id)

      if (updateError) {
        console.error("channel_selections update error:", updateError)
      }

      // Deactivate runtime tables
      await syncRuntimeTables(supabase, auth.org_id, channel, platform_id, platform_name, metadata, false)

      return NextResponse.json({ message: "Kanal hesabi devre disi birakildi" })
    }
  } catch (e: any) {
    console.error("Channel select error:", e)
    return NextResponse.json({ detail: e.message || "Kanal secimi hatasi" }, { status: 500 })
  }
}

// DELETE — Remove a channel selection
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ detail: "id zorunlu" }, { status: 400 })

  const supabase = getServiceSupabase()

  // Get selection details before deleting
  const { data: sel } = await supabase
    .from("channel_selections")
    .select("channel, platform_id, metadata")
    .eq("id", id)
    .eq("org_id", auth.org_id)
    .maybeSingle()

  if (!sel) {
    return NextResponse.json({ detail: "Secim bulunamadi" }, { status: 404 })
  }

  // Delete selection
  await supabase.from("channel_selections").delete().eq("id", id).eq("org_id", auth.org_id)

  // Deactivate runtime tables
  await syncRuntimeTables(supabase, auth.org_id, sel.channel, sel.platform_id, null, sel.metadata, false)

  return NextResponse.json({ success: true })
}

// Sync selection to runtime tables (phone_numbers for WA, channel_accounts for IG/FB)
async function syncRuntimeTables(
  supabase: any,
  orgId: string,
  channel: string,
  platformId: string,
  platformName: string | null,
  metadata: any,
  enabled: boolean
) {
  if (channel === "whatsapp") {
    if (enabled) {
      // Activate the selected phone number (multi-account: don't deactivate others)
      await supabase
        .from("phone_numbers")
        .update({ is_active: true })
        .eq("org_id", orgId)
        .eq("phone_number_id", platformId)
    } else {
      // Just deactivate this specific phone number
      await supabase
        .from("phone_numbers")
        .update({ is_active: false })
        .eq("org_id", orgId)
        .eq("phone_number_id", platformId)
    }
  } else {
    // Instagram / Messenger / Facebook
    const dbChannel = channel === "messenger" ? "facebook" : channel

    if (enabled) {
      // Upsert and activate the selected account (multi-account: don't deactivate others)
      await supabase
        .from("channel_accounts")
        .upsert({
          org_id: orgId,
          channel: dbChannel,
          account_id: platformId,
          page_id: metadata?.page_id || platformId,
          page_name: platformName || metadata?.page_name || null,
          access_token: metadata?.page_access_token || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "org_id,channel,account_id" })
    } else {
      // Deactivate this specific channel_account
      await supabase
        .from("channel_accounts")
        .update({ is_active: false })
        .eq("org_id", orgId)
        .eq("channel", dbChannel)
        .eq("account_id", platformId)
    }
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
      const wabaId = metadata?.waba_id || platformId
      const res = await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(`WhatsApp webhook failed: ${JSON.stringify(data)}`)
      return { success: true, platform: "whatsapp", data }
    }
    case "instagram": {
      const pageId = metadata?.page_id || platformId
      const pageToken = metadata?.page_access_token || accessToken
      const res = await fetch(`${GRAPH_BASE}/${pageId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${pageToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed_fields: ["messages"] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(`Instagram webhook failed: ${JSON.stringify(data)}`)
      return { success: true, platform: "instagram", data }
    }
    case "messenger": {
      const pageId = metadata?.page_id || platformId
      const pageToken = metadata?.page_access_token || accessToken
      const res = await fetch(`${GRAPH_BASE}/${pageId}/subscribed_apps`, {
        method: "POST",
        headers: { Authorization: `Bearer ${pageToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed_fields: ["messages", "messaging_postbacks"] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(`Messenger webhook failed: ${JSON.stringify(data)}`)
      return { success: true, platform: "messenger", data }
    }
    default:
      return { success: false, error: `Bilinmeyen kanal: ${channel}` }
  }
}
