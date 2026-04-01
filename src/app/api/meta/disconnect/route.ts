import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

// POST — Disconnect Meta OAuth for this org
// Removes: meta_connections, channel_selections, channel_accounts
// Deactivates (does NOT delete): waba_accounts, phone_numbers
// Reason: waba_accounts come from Embedded Signup and must survive an OAuth disconnect/reconnect cycle.
// They are reactivated when the user reconnects via OAuth callback.
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  await Promise.all([
    supabase.from("meta_connections").delete().eq("org_id", auth.org_id),
    supabase.from("channel_selections").delete().eq("org_id", auth.org_id),
    supabase.from("channel_accounts").delete().eq("org_id", auth.org_id),
    supabase.from("waba_accounts").update({ is_active: false }).eq("org_id", auth.org_id),
    supabase.from("phone_numbers").update({ is_active: false }).eq("org_id", auth.org_id),
  ])

  return NextResponse.json({ success: true })
}
