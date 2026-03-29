import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()

  // Total leads
  const { count: totalLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("org_id", auth.org_id)

  // Active deals value
  const { data: activeDeals } = await supabase
    .from("leads")
    .select("value")
    .eq("org_id", auth.org_id)
    .not("stage_id", "is", null)

  const activeDealsValue = (activeDeals || []).reduce((sum: number, d: any) => sum + (d.value || 0), 0)

  // Tasks due today
  const today = new Date().toISOString().split("T")[0]
  const { count: tasksDueToday } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("org_id", auth.org_id)
    .eq("due_date", today)

  // Conversion rate
  const { count: wonLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .eq("org_id", auth.org_id)
    .eq("status", "won")

  const conversionRate = (totalLeads && totalLeads > 0)
    ? Math.round(((wonLeads || 0) / totalLeads) * 100)
    : 0

  return NextResponse.json({
    total_leads: totalLeads || 0,
    active_deals_value: activeDealsValue,
    tasks_due_today: tasksDueToday || 0,
    conversion_rate: conversionRate,
  })
}
