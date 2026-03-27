import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Kişileri listele
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  const tag = searchParams.get("tag")
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("per_page") || "25")

  const supabase = getServiceSupabase()

  let query = supabase
    .from("contacts")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  }
  if (tag) {
    query = query.contains("tags", [tag])
  }

  const { data: contacts, error } = await query

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(
    (contacts || []).map((c: any) => ({
      id: c.id,
      wa_id: c.wa_id,
      phone: c.phone,
      name: c.name,
      profile_name: c.profile_name,
      email: c.email,
      tags: c.tags || [],
      last_message_at: c.last_message_at,
      created_at: c.created_at,
    }))
  )
}

// POST — Yeni kişi oluştur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { phone, name, email, tags } = await request.json()

  if (!phone) {
    return NextResponse.json({ detail: "Telefon numarasi zorunlu" }, { status: 400 })
  }

  // wa_id: başındaki + ve boşlukları kaldır
  const waId = phone.replace(/[\s+\-()]/g, "")

  const supabase = getServiceSupabase()

  const { data: contact, error } = await supabase
    .from("contacts")
    .insert({
      org_id: auth.org_id,
      wa_id: waId,
      phone,
      name: name || null,
      email: email || null,
      tags: tags || [],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json({
    id: contact.id,
    wa_id: contact.wa_id,
    phone: contact.phone,
    name: contact.name,
    profile_name: null,
    email: contact.email,
    tags: contact.tags || [],
    last_message_at: null,
    created_at: contact.created_at,
  })
}
