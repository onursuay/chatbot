import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Salesbot flow listesi (adimlar dahil)
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: flows, error } = await supabase
    .from("salesbot_flows")
    .select("*, salesbot_flow_steps(*)")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(flows || [])
}

// POST — Yeni flow olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.name) {
    return NextResponse.json({ detail: "Flow adi zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: flow, error: flowError } = await supabase
    .from("salesbot_flows")
    .insert({
      org_id: auth.org_id,
      name: body.name,
      description: body.description || null,
      trigger_type: body.trigger_type || "manual",
      trigger_config: body.trigger_config || {},
      is_active: body.is_active ?? false,
      created_by: auth.sub,
    })
    .select()
    .single()

  if (flowError) {
    return NextResponse.json({ detail: flowError.message }, { status: 500 })
  }

  // Adimlari varsa olustur
  if (body.steps && Array.isArray(body.steps) && body.steps.length > 0) {
    const stepRows = body.steps.map((s: any, idx: number) => ({
      flow_id: flow.id,
      org_id: auth.org_id,
      step_type: s.step_type,
      config: s.config || {},
      position: s.position ?? idx,
      delay_seconds: s.delay_seconds ?? 0,
    }))

    const { data: steps, error: stepsError } = await supabase
      .from("salesbot_flow_steps")
      .insert(stepRows)
      .select()

    if (stepsError) {
      return NextResponse.json({ detail: stepsError.message }, { status: 500 })
    }

    return NextResponse.json({ ...flow, salesbot_flow_steps: steps || [] })
  }

  return NextResponse.json({ ...flow, salesbot_flow_steps: [] })
}
