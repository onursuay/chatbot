import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) {
    return NextResponse.json({ detail: "Yetkisiz erisim" }, { status: 401 })
  }

  const supabase = getServiceSupabase()

  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("id", auth.sub)
    .single()

  if (!user) {
    return NextResponse.json({ detail: "Kullanici bulunamadi" }, { status: 404 })
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", user.org_id)
    .single()

  return NextResponse.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    org_id: org.id,
    org_name: org.name,
    org_slug: org.slug,
    org_plan: org.plan,
  })
}
