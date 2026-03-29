import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"
import { sendTemplateMessage } from "@/lib/whatsapp"

// GET — Broadcast listesi
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("org_id", auth.org_id)
    .order("created_at", { ascending: false })

  return NextResponse.json(data || [])
}

// POST — Yeni broadcast oluştur ve gönder
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()
  const { name, template_name, language, tag_filter, scheduled_at, phone_number_id } = body

  const supabase = getServiceSupabase()

  // Phone number bul — belirtilmişse onu kullan, yoksa ilk aktif numarayı al
  let phone: any = null
  let waba: any = null

  if (phone_number_id) {
    const { data } = await supabase
      .from("phone_numbers")
      .select("*, waba:waba_accounts(*)")
      .eq("phone_number_id", phone_number_id)
      .eq("org_id", auth.org_id)
      .eq("is_active", true)
      .maybeSingle()
    if (data) { phone = data; waba = data.waba }
  }

  if (!phone) {
    // Fallback: ilk aktif WABA ve numarayı al
    const { data: wabas } = await supabase
      .from("waba_accounts")
      .select("*, phone_numbers(*)")
      .eq("org_id", auth.org_id)
      .eq("is_active", true)
      .limit(1)

    if (wabas && wabas.length > 0) {
      waba = wabas[0]
      const activePhones = (waba.phone_numbers || []).filter((p: any) => p.is_active)
      if (activePhones.length > 0) phone = activePhones[0]
    }
  }

  if (!waba || !phone) {
    return NextResponse.json({ detail: "WhatsApp hesabi veya telefon numarasi bulunamadi" }, { status: 400 })
  }

  // Hedef kitleyi belirle
  let contactQuery = supabase
    .from("contacts")
    .select("*")
    .eq("org_id", auth.org_id)
    .eq("is_blocked", false)

  if (tag_filter) {
    contactQuery = contactQuery.contains("tags", [tag_filter])
  }

  const { data: contacts } = await contactQuery

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ detail: "Hedef kitlede kisi bulunamadi" }, { status: 400 })
  }

  // Broadcast kaydı oluştur
  const { data: broadcast, error } = await supabase
    .from("broadcasts")
    .insert({
      org_id: auth.org_id,
      phone_number_id: phone.id,
      name: name || `Kampanya - ${new Date().toLocaleDateString("tr-TR")}`,
      status: scheduled_at ? "scheduled" : "sending",
      scheduled_at: scheduled_at || null,
      total_recipients: contacts.length,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })

  // Zamanlanmış ise sadece kaydet
  if (scheduled_at) {
    return NextResponse.json(broadcast)
  }

  // Hemen gönder
  let sentCount = 0
  let failedCount = 0

  for (const contact of contacts) {
    try {
      const result = await sendTemplateMessage(
        phone.phone_number_id,
        waba.access_token,
        contact.wa_id,
        template_name,
        language || "tr"
      )

      // Recipient kaydı
      await supabase.from("broadcast_recipients").insert({
        broadcast_id: broadcast.id,
        contact_id: contact.id,
        status: result ? "sent" : "failed",
        wa_message_id: result?.messages?.[0]?.id || null,
        sent_at: result ? new Date().toISOString() : null,
        error_message: result ? null : "Gonderilemedi",
      })

      if (result) sentCount++
      else failedCount++
    } catch {
      failedCount++
      await supabase.from("broadcast_recipients").insert({
        broadcast_id: broadcast.id,
        contact_id: contact.id,
        status: "failed",
        error_message: "Hata olustu",
      })
    }
  }

  // Broadcast güncelle
  await supabase
    .from("broadcasts")
    .update({
      status: "completed",
      sent_count: sentCount,
      failed_count: failedCount,
      completed_at: new Date().toISOString(),
    })
    .eq("id", broadcast.id)

  return NextResponse.json({
    ...broadcast,
    status: "completed",
    sent_count: sentCount,
    failed_count: failedCount,
  })
}
