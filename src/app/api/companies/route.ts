import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Sirket listesi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search")
  const page = parseInt(searchParams.get("page") || "1")
  const perPage = parseInt(searchParams.get("per_page") || "25")

  const supabase = getServiceSupabase()

  let query = supabase
    .from("companies")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,domain.ilike.%${search}%`)
  }

  const { data: companies, error } = await query

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(companies || [])
}

// POST — Yeni sirket olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.name) {
    return NextResponse.json({ detail: "Sirket adi zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      org_id: auth.org_id,
      name: body.name,
      domain: body.domain || null,
      industry: body.industry || null,
      size: body.size || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      custom_fields: body.custom_fields || {},
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(company)
}
