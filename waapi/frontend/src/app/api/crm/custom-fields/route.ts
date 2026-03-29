import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Ozel alan tanimlari
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const entity_type = searchParams.get("entity_type")

  const supabase = getServiceSupabase()

  let query = supabase
    .from("custom_field_definitions")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("position", { ascending: true })

  if (entity_type) {
    query = query.eq("entity_type", entity_type)
  }

  const { data: fields, error } = await query

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(fields || [])
}

// POST — Yeni ozel alan tanimi olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.name || !body.field_type || !body.entity_type) {
    return NextResponse.json(
      { detail: "name, field_type ve entity_type alanlari zorunlu" },
      { status: 400 }
    )
  }

  const supabase = getServiceSupabase()

  const { data: field, error } = await supabase
    .from("custom_field_definitions")
    .insert({
      org_id: auth.org_id,
      name: body.name,
      label: body.label || body.name,
      field_type: body.field_type,
      entity_type: body.entity_type,
      options: body.options || null,
      is_required: body.is_required ?? false,
      position: body.position ?? 0,
      default_value: body.default_value || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(field)
}
