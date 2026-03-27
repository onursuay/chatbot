import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || ""
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://chatbot.yodijital.com"

export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", auth.org_id)
    .single()

  const customerId = org?.settings?.stripe_customer_id
  if (!customerId) {
    return NextResponse.json({ detail: "Abonelik bulunamadi" }, { status: 400 })
  }

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      customer: customerId,
      return_url: `${APP_URL}/dashboard/billing`,
    }).toString(),
  })
  const session = await res.json()

  return NextResponse.json({ url: session.url })
}
