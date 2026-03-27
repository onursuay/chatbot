import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  const { data: waba } = await supabase
    .from("waba_accounts")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)
    .single()

  if (!waba) {
    return NextResponse.json({ connected: false })
  }

  const { data: phones } = await supabase
    .from("phone_numbers")
    .select("*")
    .eq("waba_id", waba.id)
    .eq("is_active", true)

  return NextResponse.json({
    connected: true,
    waba_id: waba.waba_id,
    waba_name: waba.name,
    business_id: waba.business_id,
    phone_numbers: (phones || []).map((p: any) => ({
      id: p.phone_number_id,
      number: p.display_number,
      verified_name: p.verified_name,
      quality_rating: p.quality_rating,
      status: p.status,
    })),
  })
}
