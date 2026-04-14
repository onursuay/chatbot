import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz erisim" }, { status: 401 })

  const body = await request.json()
  const { current_password, new_password } = body

  if (!current_password || !new_password) {
    return NextResponse.json({ detail: "Tum alanlar zorunlu" }, { status: 400 })
  }

  if (new_password.length < 6) {
    return NextResponse.json({ detail: "Yeni sifre en az 6 karakter olmali" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: user } = await supabase
    .from("users")
    .select("password_hash")
    .eq("id", auth.sub)
    .single()

  if (!user) return NextResponse.json({ detail: "Kullanici bulunamadi" }, { status: 404 })

  const valid = await bcrypt.compare(current_password, user.password_hash)
  if (!valid) {
    return NextResponse.json({ detail: "Mevcut sifre yanlis" }, { status: 400 })
  }

  const newHash = await bcrypt.hash(new_password, 10)

  const { error } = await supabase
    .from("users")
    .update({ password_hash: newHash })
    .eq("id", auth.sub)

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
