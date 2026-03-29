import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0"

// GET — Template listesi (Meta'dan çek)
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: waba } = await supabase
    .from("waba_accounts")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)
    .single()

  if (!waba) {
    return NextResponse.json({ detail: "WhatsApp hesabi bagli degil" }, { status: 400 })
  }

  // Meta'dan template'leri çek
  const res = await fetch(
    `${GRAPH_API_BASE}/${waba.waba_id}/message_templates?fields=name,status,category,language,components`,
    { headers: { Authorization: `Bearer ${waba.access_token}` } }
  )
  const data = await res.json()

  return NextResponse.json(data.data || [])
}

// POST — Yeni template oluştur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()
  const { name, language, category, components } = body

  const supabase = getServiceSupabase()

  const { data: waba } = await supabase
    .from("waba_accounts")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)
    .single()

  if (!waba) {
    return NextResponse.json({ detail: "WhatsApp hesabi bagli degil" }, { status: 400 })
  }

  // Meta'ya template gönder
  const res = await fetch(
    `${GRAPH_API_BASE}/${waba.waba_id}/message_templates`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${waba.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        language: language || "tr",
        category: category || "MARKETING",
        components: components || [{ type: "BODY", text: body.text }],
      }),
    }
  )
  const data = await res.json()

  if (data.error) {
    return NextResponse.json({ detail: data.error.message }, { status: 400 })
  }

  // DB'ye kaydet
  await supabase.from("templates").insert({
    org_id: auth.org_id,
    waba_id: waba.id,
    meta_template_id: data.id,
    name,
    language: language || "tr",
    category: category || "MARKETING",
    status: "PENDING",
    components: components || [{ type: "BODY", text: body.text }],
  })

  return NextResponse.json(data)
}
