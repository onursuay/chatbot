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
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(pipelines || [])
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
    { name: "Yeni", position: 0 },
    { name: "Iletisimde", position: 1 },
    { name: "Teklif", position: 2 },
    { name: "Kazanildi", position: 3 },
    { name: "Kaybedildi", position: 4 },
  ]

  const stageRows = defaultStages.map((s: any) => ({
    pipeline_id: pipeline.id,
    org_id: auth.org_id,
    name: s.name,
    position: s.position,
  }))

  const { data: createdStages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .insert(stageRows)
    .select()

  if (stagesError) {
    return NextResponse.json({ detail: stagesError.message }, { status: 500 })
  }

  return NextResponse.json({ ...pipeline, pipeline_stages: createdStages || [] })
}
