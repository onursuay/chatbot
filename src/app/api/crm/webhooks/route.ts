import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Webhook listesi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: webhooks, error } = await supabase
    .from("webhook_configs")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(webhooks || [])
}

// POST — Yeni webhook olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.url || !body.events) {
    return NextResponse.json({ detail: "URL ve events alanlari zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: webhook, error } = await supabase
    .from("webhook_configs")
    .insert({
      org_id: auth.org_id,
      url: body.url,
      events: body.events,
      secret: body.secret || null,
      is_active: body.is_active ?? true,
      headers: body.headers || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(webhook)
}

// PATCH — Webhook guncelle
export async function PATCH(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ detail: "Webhook id zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const updates: Record<string, any> = {}
  const allowedFields = ["url", "events", "secret", "is_active", "headers"]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  const { data: webhook, error } = await supabase
    .from("webhook_configs")
    .update(updates)
    .eq("id", body.id)
    .eq("org_id", auth.org_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(webhook)
}

// DELETE — Webhook sil
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const webhook_id = searchParams.get("webhook_id")

  if (!webhook_id) {
    return NextResponse.json({ detail: "webhook_id zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { error } = await supabase
    .from("webhook_configs")
    .delete()
    .eq("id", webhook_id)
    .eq("org_id", auth.org_id)

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
