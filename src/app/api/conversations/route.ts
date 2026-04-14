import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Konuşmaları listele
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const channel = searchParams.get("channel")
  const phoneNumberId = searchParams.get("phone_number_id")
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("per_page") || "25")

  const supabase = getServiceSupabase()

  let query = supabase
    .from("conversations")
    .select("*, contact:contacts(*), phone:phone_numbers(display_number, verified_name), channel_account:channel_accounts(page_name, account_id, page_id, channel)")
    .eq("org_id", auth.org_id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (status) {
    query = query.eq("status", status)
  }

  if (channel && channel !== "all") {
    // "messenger" → "facebook" eşlemesi: Messenger webhook'u konuşmaları channel="facebook" olarak kaydeder
    const dbChannel = channel === "messenger" ? "facebook" : channel
    // channel kolonu null olan eski kayıtları da yakalamak için OR filtresi
    query = query.or(`channel.eq.${dbChannel},and(channel.is.null,metadata->>channel.eq.${dbChannel})`)
  }

  if (phoneNumberId) {
    query = query.eq("phone_number_id", phoneNumberId)
  }

  const { data: convs, error } = await query

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(
    (convs || []).map((conv: any) => {
      // channel kolonu > metadata.channel > channel_account.channel > "whatsapp" öncelik sırası
      const caChannel = conv.channel_account?.channel
      const channelValue = conv.channel || conv.metadata?.channel || caChannel || "whatsapp"
      const accountLabel =
        channelValue === "whatsapp"
          ? conv.phone?.display_number || conv.phone?.verified_name || null
          : conv.channel_account?.page_name || conv.channel_account?.account_id || conv.channel_account?.page_id || null

      return {
        id: conv.id,
        contact_id: conv.contact_id,
        contact_name: conv.contact?.name || null,
        contact_phone: conv.contact?.phone || null,
        status: conv.status,
        assigned_to: conv.assigned_to,
        labels: conv.labels || [],
        last_message_at: conv.last_message_at,
        last_message_preview: conv.last_message_preview,
        unread_count: conv.unread_count,
        is_bot_active: conv.is_bot_active,
        channel: channelValue,
        account_label: accountLabel,
        phone_number_id: conv.phone_number_id || null,
        channel_account_id: conv.channel_account_id || null,
        created_at: conv.created_at,
      }
    })
  )
}
