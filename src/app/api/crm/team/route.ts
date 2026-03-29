import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Takim uyeleri listesi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: members, error } = await supabase
    .from("users")
    .select("id, email, full_name, role, avatar_url, is_active, created_at")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(members || [])
}
