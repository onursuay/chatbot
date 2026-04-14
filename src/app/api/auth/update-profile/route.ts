import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

export async function PATCH(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz erisim" }, { status: 401 })

  const body = await request.json()
  const { full_name, avatar_url } = body

  if (!full_name || full_name.trim().length < 2) {
    return NextResponse.json({ detail: "Ad Soyad en az 2 karakter olmalı" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const updateData: Record<string, string> = { full_name: full_name.trim() }
  if (typeof avatar_url === "string") {
    updateData.avatar_url = avatar_url
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", auth.sub)
    .select("id, email, full_name, role, avatar_url")
    .single()

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })

  return NextResponse.json(data)
}
