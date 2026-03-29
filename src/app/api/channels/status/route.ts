import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

// GET — Tüm kanal durumlarını getir (multi-account)
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // WhatsApp — tüm WABA'lar ve telefon numaraları
  const { data: wabas } = await supabase
    .from("waba_accounts")
    .select("*, phone_numbers(*)")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)

  // Instagram & Facebook — channel_accounts tablosu
  const { data: channelAccounts } = await supabase
    .from("channel_accounts")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("is_active", true)

  return NextResponse.json({
    connected: (wabas && wabas.length > 0),
    accounts: (wabas || []).map((w: any) => ({
      id: w.id,
      waba_id: w.waba_id,
      waba_name: w.name,
      business_id: w.business_id,
      phone_numbers: (w.phone_numbers || [])
        .filter((p: any) => p.is_active)
        .map((p: any) => ({
          id: p.phone_number_id,
          db_id: p.id,
          number: p.display_number,
          verified_name: p.verified_name,
          quality_rating: p.quality_rating,
          status: p.status,
        })),
    })),
    channel_accounts: (channelAccounts || []).map((ch: any) => ({
      id: ch.id,
      channel: ch.channel,
      account_id: ch.account_id,
      page_id: ch.page_id,
      page_name: ch.page_name,
      is_active: ch.is_active,
    })),
  })
}
