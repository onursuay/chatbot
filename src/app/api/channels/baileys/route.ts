import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

export const dynamic = "force-dynamic"

// GET — Mevcut Baileys (WA Kişisel) bağlantı durumu
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from("channel_accounts")
    .select("id, account_id, page_name, is_active, metadata, created_at")
    .eq("org_id", auth.org_id)
    .eq("channel", "whatsapp_personal")
    .eq("is_active", true)
    .maybeSingle()

  return NextResponse.json({
    connected: !!data,
    phone: data?.account_id || null,
    service_url: data?.metadata?.service_url || null,
  })
}

// POST — Baileys servisi bağla: service_url + secret kaydet
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { service_url, secret } = await request.json()
  if (!service_url?.trim() || !secret?.trim()) {
    return NextResponse.json({ detail: "service_url ve secret gerekli" }, { status: 400 })
  }

  // Baileys servisine bağlantı testi
  let phone: string | null = null
  try {
    const res = await fetch(service_url.trim(), {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const data = await res.json()
      phone = data?.number || null
      if (!data?.connected) {
        return NextResponse.json({
          detail: "Baileys servisi çalışıyor ama WhatsApp'a bağlı değil. Terminaldeki QR kodu telefonla tarayın.",
        }, { status: 400 })
      }
    } else {
      return NextResponse.json({ detail: "Baileys servisi yanıt vermedi (HTTP " + res.status + ")" }, { status: 400 })
    }
  } catch (err: any) {
    return NextResponse.json({
      detail: `Baileys servisine ulaşılamadı: ${err.message}. Servisin çalışır durumda olduğundan emin olun.`,
    }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Varsa eski kaydı kaldır
  await supabase
    .from("channel_accounts")
    .delete()
    .eq("org_id", auth.org_id)
    .eq("channel", "whatsapp_personal")

  // Yeni kaydı ekle
  const { error } = await supabase
    .from("channel_accounts")
    .insert({
      org_id: auth.org_id,
      channel: "whatsapp_personal",
      account_id: phone || "whatsapp_personal",
      page_name: phone ? `WhatsApp Kişisel (+${phone})` : "WhatsApp Kişisel",
      access_token: secret.trim(),
      is_active: true,
      metadata: { service_url: service_url.trim() },
    })

  if (error) {
    return NextResponse.json({ detail: "Kayıt hatası: " + error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, phone })
}

// DELETE — Baileys bağlantısını kes
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()
  await supabase
    .from("channel_accounts")
    .delete()
    .eq("org_id", auth.org_id)
    .eq("channel", "whatsapp_personal")

  return NextResponse.json({ ok: true })
}
