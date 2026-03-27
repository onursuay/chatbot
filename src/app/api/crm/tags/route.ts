import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Etiket listesi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const entity_type = searchParams.get("entity_type")

  const supabase = getServiceSupabase()

  let query = supabase
    .from("tags")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("name", { ascending: true })

  if (entity_type) {
    query = query.eq("entity_type", entity_type)
  }

  const { data: tags, error } = await query

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(tags || [])
}

// POST — Yeni etiket olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.name) {
    return NextResponse.json({ detail: "Etiket adi zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: tag, error } = await supabase
    .from("tags")
    .insert({
      org_id: auth.org_id,
      name: body.name,
      color: body.color || null,
      entity_type: body.entity_type || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(tag)
}

// DELETE — Etiket sil
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tag_id = searchParams.get("tag_id")

  if (!tag_id) {
    return NextResponse.json({ detail: "tag_id zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { error } = await supabase
    .from("tags")
    .delete()
    .eq("id", tag_id)
    .eq("org_id", auth.org_id)

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
