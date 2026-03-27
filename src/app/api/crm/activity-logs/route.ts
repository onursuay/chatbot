import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Aktivite loglari (filtreli, sayfalanmis)
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const entity_type = searchParams.get("entity_type")
  const entity_id = searchParams.get("entity_id")
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("per_page") || "50")

  const supabase = getServiceSupabase()

  let query = supabase
    .from("activity_logs")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (entity_type) {
    query = query.eq("entity_type", entity_type)
  }
  if (entity_id) {
    query = query.eq("entity_id", entity_id)
  }

  const { data: logs, error } = await query

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(logs || [])
}
