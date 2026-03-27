import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Web form listesi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: forms, error } = await supabase
    .from("web_forms")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(forms || [])
}

// POST — Yeni web form olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.name) {
    return NextResponse.json({ detail: "Form adi zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: form, error } = await supabase
    .from("web_forms")
    .insert({
      org_id: auth.org_id,
      name: body.name,
      description: body.description || null,
      fields: body.fields || [],
      pipeline_id: body.pipeline_id || null,
      stage_id: body.stage_id || null,
      is_active: body.is_active ?? true,
      redirect_url: body.redirect_url || null,
      style: body.style || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(form)
}
