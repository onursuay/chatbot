import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// DELETE — Pipeline sil
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // Pipeline'ın bu org'a ait olduğunu doğrula
  const { data: pipeline } = await supabase
    .from("pipelines")
    .select("id")
    .eq("id", params.id)
    .eq("org_id", auth.org_id)
    .single()

  if (!pipeline) {
    return NextResponse.json({ detail: "Pipeline bulunamadı" }, { status: 404 })
  }

  // Önce stage'leri sil
  await supabase.from("pipeline_stages").delete().eq("pipeline_id", params.id)

  // Sonra pipeline'ı sil
  const { error } = await supabase.from("pipelines").delete().eq("id", params.id)

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
