import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Chatbot config for org
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from("chatbot_configs")
    .select("*")
    .eq("org_id", auth.org_id)
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// PATCH — Update chatbot config
export async function PATCH(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  const allowed = [
    "system_prompt",
    "knowledge_base",
    "ai_model",
    "temperature",
    "max_tokens",
    "welcome_message",
    "is_active",
    "transfer_keywords",
    "close_keywords",
    "out_of_hours_message",
    "business_hours",
  ]

  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from("chatbot_configs")
    .update(updates)
    .eq("org_id", auth.org_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
