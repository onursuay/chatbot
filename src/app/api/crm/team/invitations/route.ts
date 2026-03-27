import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

// GET — Davet listesi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: invitations, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(invitations || [])
}

// POST — Yeni davet olustur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.email) {
    return NextResponse.json({ detail: "Email zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      org_id: auth.org_id,
      email: body.email,
      role: body.role || "member",
      token,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      invited_by: auth.sub,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(invitation)
}

// DELETE — Daveti iptal et
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const invitation_id = searchParams.get("invitation_id")

  if (!invitation_id) {
    return NextResponse.json({ detail: "invitation_id zorunlu" }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  const { data: invitation, error } = await supabase
    .from("invitations")
    .update({ status: "cancelled" })
    .eq("id", invitation_id)
    .eq("org_id", auth.org_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ detail: error.message }, { status: 500 })
  }

  return NextResponse.json(invitation)
}
