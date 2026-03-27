import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Dashboard widget listesi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: widgets, error } = await supabase
    .from("dashboard_widgets")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("user_id", auth.sub)
    .order("position", { ascending: true })

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(widgets || [])
}

// POST — Yeni widget olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.type) {
    return NextResponse.json({ detail: "Widget type zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: widget, error } = await supabase
    .from("dashboard_widgets")
    .insert({
      org_id: auth.org_id,
      user_id: auth.sub,
      type: body.type,
      title: body.title || null,
      config: body.config || {},
      position: body.position ?? 0,
      size: body.size || "medium",
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(widget)
}

// PATCH — Widget guncelle (pozisyon/config)
export async function PATCH(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ detail: "Widget id zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const updates: Record<string, any> = {}
  const allowedFields = ["title", "config", "position", "size"]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  const { data: widget, error } = await supabase
    .from("dashboard_widgets")
    .update(updates)
    .eq("id", body.id)
    .eq("org_id", auth.org_id)
    .eq("user_id", auth.sub)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(widget)
}

// DELETE — Widget sil
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const widget_id = searchParams.get("widget_id")

  if (!widget_id) {
    return NextResponse.json({ detail: "widget_id zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { error } = await supabase
    .from("dashboard_widgets")
    .delete()
    .eq("id", widget_id)
    .eq("org_id", auth.org_id)
    .eq("user_id", auth.sub)

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
