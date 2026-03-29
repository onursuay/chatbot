import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { createAccessToken, createRefreshToken } from "@/lib/jwt"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ detail: "Email ve sifre zorunlu" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // User bul
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single()

    if (!user) {
      return NextResponse.json({ detail: "Gecersiz email veya sifre" }, { status: 401 })
    }

    // Password kontrol
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ detail: "Gecersiz email veya sifre" }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ detail: "Hesap devre disi" }, { status: 401 })
    }

    // Org bilgisi
    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", user.org_id)
      .single()

    // Last login güncelle
    await supabase
      .from("users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id)

    // Token
    const tokenPayload = {
      sub: user.id,
      org_id: org.id,
      role: user.role,
      email: user.email,
    }

    const accessToken = await createAccessToken(tokenPayload)
    const refreshToken = await createRefreshToken(tokenPayload)

    return NextResponse.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
    })
  } catch (e: any) {
    console.error("Login error:", e)
    return NextResponse.json({ detail: e.message || "Giris hatasi" }, { status: 500 })
  }
}
