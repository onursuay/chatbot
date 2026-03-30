import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

// GET — Check Meta connection status for this org
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: connection } = await supabase
    .from("meta_connections")
    .select("status, expires_at, scopes, updated_at")
    .eq("org_id", auth.org_id)
    .maybeSingle()

  if (!connection) {
    return NextResponse.json({
      connected: false,
      status: null,
      expires_at: null,
      scopes: [],
    })
  }

  // Check if token is still valid
  const isExpired = new Date(connection.expires_at) < new Date()
  const effectiveStatus = isExpired ? "expired" : connection.status

  return NextResponse.json({
    connected: effectiveStatus === "active",
    status: effectiveStatus,
    expires_at: connection.expires_at,
    scopes: connection.scopes || [],
    updated_at: connection.updated_at,
  })
}
