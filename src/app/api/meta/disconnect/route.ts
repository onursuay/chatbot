import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

// POST — Disconnect Meta OAuth for this org
// Removes everything: meta_connections, channel_selections, channel_accounts, waba_accounts, phone_numbers
// waba_accounts are tied to a specific Meta account; on reconnect the user may use a different account,
// so stale waba data must not persist. A fresh Embedded Signup repopulates them after reconnect.
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // Nullify phone_number_id FK references before deleting phone_numbers
  await Promise.all([
    supabase.from("conversations").update({ phone_number_id: null }).eq("org_id", auth.org_id),
    supabase.from("broadcasts").update({ phone_number_id: null }).eq("org_id", auth.org_id),
  ])

  await Promise.all([
    supabase.from("meta_connections").delete().eq("org_id", auth.org_id),
    supabase.from("channel_selections").delete().eq("org_id", auth.org_id),
    supabase.from("channel_accounts").delete().eq("org_id", auth.org_id),
    supabase.from("phone_numbers").delete().eq("org_id", auth.org_id),
    supabase.from("waba_accounts").delete().eq("org_id", auth.org_id),
  ])

  return NextResponse.json({ success: true })
}
