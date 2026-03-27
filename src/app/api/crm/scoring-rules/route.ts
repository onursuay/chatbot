import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Puanlama kurallari listesi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: rules, error } = await supabase
    .from("scoring_rules")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(rules || [])
}

// POST — Yeni puanlama kurali olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.name || body.score === undefined) {
    return NextResponse.json(
      { detail: "name ve score alanlari zorunlu" },
      { status: 400 }
    )
  }

  const supabase = getServiceSupabase()

  const { data: rule, error } = await supabase
    .from("scoring_rules")
    .insert({
      org_id: auth.org_id,
      name: body.name,
      description: body.description || null,
      condition_type: body.condition_type || "event",
      condition_config: body.condition_config || {},
      score: body.score,
      is_active: body.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(rule)
}

// DELETE — Puanlama kurali sil
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const rule_id = searchParams.get("rule_id")

  if (!rule_id) {
    return NextResponse.json({ detail: "rule_id zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { error } = await supabase
    .from("scoring_rules")
    .delete()
    .eq("id", rule_id)
    .eq("org_id", auth.org_id)

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
