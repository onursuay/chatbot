import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Lead listesi (filtreli)
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const pipeline_id = searchParams.get("pipeline_id")
  const stage_id = searchParams.get("stage_id")
  const status = searchParams.get("status")
  const search = searchParams.get("search")
  const assigned_to = searchParams.get("assigned_to")
  const lead_id = searchParams.get("id")
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("per_page") || "50")

  const supabase = getServiceSupabase()

  // Tek lead getir
  if (lead_id) {
    const { data: lead, error } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("org_id", auth.org_id)
      .single()

    if (error) return NextResponse.json({ detail: error.message }, { status: 404 })

    const [{ data: stageRow }, { data: pipelineRow }, { data: contactRow }] = await Promise.all([
      lead.stage_id
        ? supabase.from("pipeline_stages").select("id, name").eq("id", lead.stage_id).maybeSingle()
        : Promise.resolve({ data: null }),
      lead.pipeline_id
        ? supabase.from("pipelines").select("id, name").eq("id", lead.pipeline_id).maybeSingle()
        : Promise.resolve({ data: null }),
      lead.contact_id
        ? supabase.from("contacts").select("id, name, phone, wa_id").eq("id", lead.contact_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    return NextResponse.json({
      ...lead,
      stage_name: (stageRow as any)?.name || null,
      pipeline_name: (pipelineRow as any)?.name || null,
      contact_name: (contactRow as any)?.name || (contactRow as any)?.phone || (contactRow as any)?.wa_id || null,
      assigned_user_name: null,
    })
  }

  let query = supabase
    .from("leads")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (pipeline_id) query = query.eq("pipeline_id", pipeline_id)
  if (stage_id) query = query.eq("stage_id", stage_id)
  if (status) query = query.eq("status", status)
  if (assigned_to) query = query.eq("assigned_to", assigned_to)
  if (search) query = query.ilike("title", `%${search}%`)

  const { data: rawLeads, error } = await query

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  const leads = rawLeads || []
  if (leads.length === 0) return NextResponse.json([])

  // Batch enrich with stage, pipeline, contact names
  const stageIds = Array.from(new Set(leads.map((l: any) => l.stage_id).filter(Boolean)))
  const pipelineIds = Array.from(new Set(leads.map((l: any) => l.pipeline_id).filter(Boolean)))
  const contactIds = Array.from(new Set(leads.map((l: any) => l.contact_id).filter(Boolean)))

  const [{ data: stages }, { data: pipelines }, { data: contacts }] = await Promise.all([
    stageIds.length > 0
      ? supabase.from("pipeline_stages").select("id, name").in("id", stageIds)
      : Promise.resolve({ data: [] }),
    pipelineIds.length > 0
      ? supabase.from("pipelines").select("id, name").in("id", pipelineIds)
      : Promise.resolve({ data: [] }),
    contactIds.length > 0
      ? supabase.from("contacts").select("id, name, phone, wa_id").in("id", contactIds)
      : Promise.resolve({ data: [] }),
  ])

  const stageMap = Object.fromEntries((stages || []).map((s: any) => [s.id, s.name]))
  const pipelineMap = Object.fromEntries((pipelines || []).map((p: any) => [p.id, p.name]))
  const contactMap = Object.fromEntries((contacts || []).map((c: any) => [c.id, c.name || c.phone || c.wa_id]))

  const enriched = leads.map((l: any) => ({
    ...l,
    stage_name: stageMap[l.stage_id] || null,
    pipeline_name: pipelineMap[l.pipeline_id] || null,
    contact_name: contactMap[l.contact_id] || null,
    assigned_user_name: null,
  }))

  return NextResponse.json(enriched)
}

// POST — Yeni lead olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.title) {
    return NextResponse.json({ detail: "Lead basligi zorunlu" }, { status: 400 })
  }
  if (!body.pipeline_id || !body.stage_id) {
    return NextResponse.json({ detail: "Pipeline ve asama zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      org_id: auth.org_id,
      title: body.title,
      pipeline_id: body.pipeline_id,
      stage_id: body.stage_id,
      status: body.status || "active",
      value: body.value || 0,
      currency: body.currency || "TRY",
      company_id: body.company_id || null,
      contact_id: body.contact_id || null,
      source_id: body.source_id || null,
      assigned_to: body.assigned_to || null,
      attributes: body.attributes || {},
      tags: body.tags || [],
      score: body.score || 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(lead)
}

// PATCH — Lead guncelle
export async function PATCH(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ detail: "Lead id zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const updates: Record<string, any> = {}
  const allowedFields = [
    "title", "pipeline_id", "stage_id", "status", "value", "currency",
    "company_id", "contact_id", "source_id", "assigned_to",
    "attributes", "tags", "score", "loss_reason", "next_action_at",
  ]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  // Won/Lost durumlarında closed_at set et
  if (body.status === "won" || body.status === "lost") {
    updates.closed_at = new Date().toISOString()
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", body.id)
    .eq("org_id", auth.org_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(lead)
}
