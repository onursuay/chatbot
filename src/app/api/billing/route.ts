import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || ""
const STRIPE_API = "https://api.stripe.com/v1"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://chatbot.yodijital.com"

const PLANS = {
  starter: { name: "Baslangic", price_monthly: 2900, price_id: process.env.STRIPE_STARTER_PRICE_ID || "" },
  pro: { name: "Profesyonel", price_monthly: 7900, price_id: process.env.STRIPE_PRO_PRICE_ID || "" },
  business: { name: "Isletme", price_monthly: 19900, price_id: process.env.STRIPE_BUSINESS_PRICE_ID || "" },
}

async function stripeRequest(endpoint: string, body?: Record<string, string>, method = "POST") {
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  })
  return res.json()
}

// POST — Checkout session oluştur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { plan } = await request.json()
  const planConfig = PLANS[plan as keyof typeof PLANS]
  if (!planConfig || !planConfig.price_id) {
    return NextResponse.json({ detail: "Gecersiz plan" }, { status: 400 })
  }

  const supabase = getServiceSupabase()
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", auth.org_id)
    .single()

  // Stripe customer oluştur veya mevcut olanı kullan
  let customerId = org?.settings?.stripe_customer_id

  if (!customerId) {
    const customer = await stripeRequest("/customers", {
      email: auth.email,
      name: org?.name || "",
      "metadata[org_id]": auth.org_id,
    })
    customerId = customer.id

    await supabase
      .from("organizations")
      .update({ settings: { ...org?.settings, stripe_customer_id: customerId } })
      .eq("id", auth.org_id)
  }

  // Checkout session oluştur
  const session = await stripeRequest("/checkout/sessions", {
    customer: customerId,
    "line_items[0][price]": planConfig.price_id,
    "line_items[0][quantity]": "1",
    mode: "subscription",
    success_url: `${APP_URL}/dashboard/billing?success=true`,
    cancel_url: `${APP_URL}/dashboard/billing?cancelled=true`,
    "metadata[org_id]": auth.org_id,
    "metadata[plan]": plan,
  })

  return NextResponse.json({ url: session.url })
}

// GET — Mevcut abonelik bilgisi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", auth.org_id)
    .single()

  return NextResponse.json({
    plan: org?.plan || "trial",
    stripe_customer_id: org?.settings?.stripe_customer_id || null,
    plans: Object.entries(PLANS).map(([key, val]) => ({
      id: key,
      name: val.name,
      price: val.price_monthly,
    })),
  })
}
