import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Pipeline listesi (stages dahil)
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: pipelines, error } = await supabase
    .from("pipelines")
    .select("*, pipeline_stages(*)")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  // Frontend "stages" bekliyor, Supabase "pipeline_stages" dönüyor
  const mapped = (pipelines || []).map((p: any) => ({
    ...p,
    stages: (p.pipeline_stages || []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }))

  return NextResponse.json(mapped)
}

// POST — Yeni pipeline + varsayilan asamalar
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { name, stages } = await request.json()

  if (!name) {
    return NextResponse.json({ detail: "Pipeline adi zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Pipeline olustur
  const { data: pipeline, error: pipelineError } = await supabase
    .from("pipelines")
    .insert({ org_id: auth.org_id, name })
    .select()
    .single()

  if (pipelineError) {
    return NextResponse.json({ detail: pipelineError.message }, { status: 500 })
  }

  // Varsayilan veya belirtilen asamalari olustur
  const defaultStages = stages || [
    { name: "Yeni", sort_order: 0, color: "#6B7280" },
    { name: "İletişimde", sort_order: 1, color: "#3B82F6" },
    { name: "Teklif", sort_order: 2, color: "#8B5CF6" },
    { name: "Kazanıldı", sort_order: 3, color: "#10B981", is_win: true },
    { name: "Kaybedildi", sort_order: 4, color: "#EF4444", is_loss: true },
  ]

  const stageRows = defaultStages.map((s: any) => ({
    pipeline_id: pipeline.id,
    name: s.name,
    sort_order: s.sort_order ?? s.position ?? 0,
    color: s.color || "#3B82F6",
    is_win: s.is_win || false,
    is_loss: s.is_loss || false,
  }))

  const { data: createdStages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .insert(stageRows)
    .select()

  if (stagesError) {
    return NextResponse.json({ detail: stagesError.message }, { status: 500 })
  }

  return NextResponse.json({ ...pipeline, stages: createdStages || [], pipeline_stages: createdStages || [] })
}
