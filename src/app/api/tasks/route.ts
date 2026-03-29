import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Gorev listesi (filtreli)
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const assigned_to = searchParams.get("assigned_to")
  const type = searchParams.get("type")
  const lead_id = searchParams.get("lead_id")
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("per_page") || "25")

  const supabase = getServiceSupabase()

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("due_date", { ascending: true, nullsFirst: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (status) {
    query = query.eq("status", status)
  }
  if (assigned_to) {
    query = query.eq("assigned_to", assigned_to)
  }
  if (type) {
    query = query.eq("type", type)
  }
  if (lead_id) {
    query = query.eq("lead_id", lead_id)
  }

  const { data: tasks, error } = await query

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(tasks || [])
}

// POST — Yeni gorev olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.title) {
    return NextResponse.json({ detail: "Gorev basligi zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      org_id: auth.org_id,
      title: body.title,
      description: body.description || null,
      type: body.type || "task",
      status: body.status || "pending",
      priority: body.priority || "medium",
      due_date: body.due_date || null,
      assigned_to: body.assigned_to || null,
      lead_id: body.lead_id || null,
      contact_id: body.contact_id || null,
      created_by: auth.sub,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(task)
}

// PATCH — Gorev guncelle
export async function PATCH(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.id) {
    return NextResponse.json({ detail: "Gorev id zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const updates: Record<string, any> = {}
  const allowedFields = [
    "title", "description", "type", "status", "priority",
    "due_date", "assigned_to", "lead_id", "contact_id",
  ]

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = body[field]
    }
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", body.id)
    .eq("org_id", auth.org_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(task)
}
