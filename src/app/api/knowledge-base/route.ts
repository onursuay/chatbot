import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Knowledge base items listesi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  const supabase = getServiceSupabase()

  let query = supabase
    .from("knowledge_base_items")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: false })

  if (type) query = query.eq("type", type)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}

// POST — Yeni knowledge base item olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.type || !["text", "url", "faq"].includes(body.type)) {
    return NextResponse.json({ detail: "Gecerli bir type zorunlu (text, url, faq)" }, { status: 400 })
  }
  if (!body.title) {
    return NextResponse.json({ detail: "Title zorunlu" }, { status: 400 })
  }
  if (!body.content) {
    return NextResponse.json({ detail: "Content zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from("knowledge_base_items")
    .insert({
      org_id: auth.org_id,
      type: body.type,
      title: body.title,
      content: body.content,
      url: body.url || null,
      category: body.category || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE — Knowledge base item sil
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ detail: "id parametresi zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { error } = await supabase
    .from("knowledge_base_items")
    .delete()
    .eq("id", id)
    .eq("org_id", auth.org_id)

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
