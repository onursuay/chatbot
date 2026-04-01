import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

// POST — Fully disconnect Meta account for this org
// Clears: meta_connections, channel_selections, channel_accounts, waba_accounts, phone_numbers (deactivate)
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  await Promise.all([
    supabase.from("meta_connections").delete().eq("org_id", auth.org_id),
    supabase.from("channel_selections").delete().eq("org_id", auth.org_id),
    supabase.from("channel_accounts").delete().eq("org_id", auth.org_id),
    supabase.from("waba_accounts").delete().eq("org_id", auth.org_id),
    supabase.from("phone_numbers").update({ is_active: false }).eq("org_id", auth.org_id),
  ])

  return NextResponse.json({ success: true })
}
