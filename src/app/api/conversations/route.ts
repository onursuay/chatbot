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
    .select("*, contact:contacts(*)")
    .eq("org_id", auth.org_id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * perPage, page * perPage - 1)

  // Lead bilgilerini contact_id üzerinden çek
  const { data: orgLeads } = await supabase
    .from("leads")
    .select("id, contact_id, stage_id, pipeline_id, title, status, pipeline_stages(id, name, color)")
    .eq("org_id", auth.org_id)
    .eq("status", "active")

  const leadByContact = new Map<string, any>()
  for (const lead of (orgLeads || [])) {
    if (lead.contact_id) leadByContact.set(lead.contact_id, lead)
  }

  if (status) {
    query = query.eq("status", status)
  }

  if (channel && channel !== "all") {
    query = query.eq("channel", channel)
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
      const lead = leadByContact.get(conv.contact_id)
      const stage = lead?.pipeline_stages
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
        channel: conv.metadata?.channel || conv.channel || "whatsapp",
        phone_number_id: conv.phone_number_id || null,
        channel_account_id: conv.channel_account_id || null,
        created_at: conv.created_at,
        lead_id: lead?.id || null,
        lead_stage_id: lead?.stage_id || null,
        lead_stage_name: stage?.name || null,
        lead_stage_color: stage?.color || null,
        lead_pipeline_id: lead?.pipeline_id || null,
      }
    })
  )
}
