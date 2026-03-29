import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"

// Stripe Webhook — abonelik değişikliklerini yakala
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const event = body

    const supabase = getServiceSupabase()

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        const orgId = session.metadata?.org_id
        const plan = session.metadata?.plan

        if (orgId && plan) {
          await supabase
            .from("organizations")
            .update({ plan })
            .eq("id", orgId)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object
        const customerId = subscription.customer

        // Customer'dan org bul
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, settings")
          .filter("settings->>stripe_customer_id", "eq", customerId)

        if (orgs && orgs.length > 0) {
          const status = subscription.status
          if (status === "canceled" || status === "unpaid") {
            await supabase
              .from("organizations")
              .update({ plan: "trial" })
              .eq("id", orgs[0].id)
          }
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object
        const customerId = subscription.customer

        const { data: orgs } = await supabase
          .from("organizations")
          .select("id")
          .filter("settings->>stripe_customer_id", "eq", customerId)

        if (orgs && orgs.length > 0) {
          await supabase
            .from("organizations")
            .update({ plan: "trial" })
            .eq("id", orgs[0].id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch {
    return NextResponse.json({ received: true })
  }
}
