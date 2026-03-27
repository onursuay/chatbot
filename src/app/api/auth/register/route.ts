import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { createAccessToken, createRefreshToken } from "@/lib/jwt"
import bcrypt from "bcryptjs"

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .slice(0, 100)
}

export async function POST(request: Request) {
  try {
    const { email, password, full_name, org_name } = await request.json()

    if (!email || !password || !full_name || !org_name) {
      return NextResponse.json({ detail: "Tum alanlar zorunlu" }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // Email kontrolü
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      return NextResponse.json({ detail: "Bu email adresi zaten kayitli" }, { status: 400 })
    }

    // Slug oluştur
    let slug = slugify(org_name)
    let counter = 1
    while (true) {
      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", slug)
        .single()
      if (!existingOrg) break
      slug = `${slugify(org_name)}-${counter}`
      counter++
    }

    // Organization oluştur
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name: org_name, slug, plan: "trial" })
      .select()
      .single()

    if (orgError) throw orgError

    // Password hash
    const passwordHash = await bcrypt.hash(password, 10)

    // User oluştur
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        org_id: org.id,
        email,
        password_hash: passwordHash,
        full_name,
        role: "owner",
      })
      .select()
      .single()

    if (userError) throw userError

    // Default chatbot config
    await supabase.from("chatbot_configs").insert({
      org_id: org.id,
      name: "Default Bot",
      system_prompt:
        "Sen bir WhatsApp asistanisin. Musterilere yardimci ol, kibar ve profesyonel ol. Kisa ve oz yanitlar ver.",
      is_active: true,
    })

    // Token oluştur
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
    console.error("Register error:", e)
    return NextResponse.json({ detail: e.message || "Kayit hatasi" }, { status: 500 })
  }
}
