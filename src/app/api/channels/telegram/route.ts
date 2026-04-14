import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"
import { getTelegramBotInfo, setTelegramWebhook } from "@/lib/telegram"

export const dynamic = "force-dynamic"

// GET — Mevcut Telegram bağlantı durumu
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()
  const { data } = await supabase
    .from("channel_accounts")
    .select("id, account_id, page_name, is_active, created_at")
    .eq("org_id", auth.org_id)
    .eq("channel", "telegram")
    .eq("is_active", true)
    .maybeSingle()

  return NextResponse.json({
    connected: !!data,
    bot_username: data?.account_id || null,
    bot_name: data?.page_name || null,
  })
}

// POST — Telegram bağla: bot token kaydet + webhook kur
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const { bot_token } = await request.json()
  if (!bot_token?.trim()) {
    return NextResponse.json({ detail: "Bot token gerekli" }, { status: 400 })
  }

  // Bot bilgilerini doğrula
  const botInfo = await getTelegramBotInfo(bot_token.trim())
  if (!botInfo) {
    return NextResponse.json({ detail: "Geçersiz bot token. @BotFather'dan aldığınız token'ı kontrol edin." }, { status: 400 })
  }

  // Webhook URL kur (Next.js uygulamasının URL'i)
  const appUrl = process.env.NEXTJS_APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    return NextResponse.json({ detail: "NEXTJS_APP_URL env değişkeni tanımlı değil" }, { status: 500 })
  }

  const webhookUrl = `${appUrl}/api/webhook/telegram`
  const webhookResult = await setTelegramWebhook(bot_token.trim(), webhookUrl, auth.org_id)

  if (!webhookResult.ok) {
    return NextResponse.json({
      detail: `Webhook kurulamadı: ${webhookResult.description || "Bilinmeyen hata"}`,
    }, { status: 400 })
  }

  const supabase = getServiceSupabase()

  // Varsa eski kaydı kaldır
  await supabase
    .from("channel_accounts")
    .delete()
    .eq("org_id", auth.org_id)
    .eq("channel", "telegram")

  // Yeni kaydı ekle
  const { error } = await supabase
    .from("channel_accounts")
    .insert({
      org_id: auth.org_id,
      channel: "telegram",
      account_id: botInfo.username || String(botInfo.id),
      page_name: botInfo.first_name || botInfo.username,
      access_token: bot_token.trim(),
      is_active: true,
    })

  if (error) {
    return NextResponse.json({ detail: "Kayıt hatası: " + error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    bot_username: botInfo.username,
    bot_name: botInfo.first_name,
    webhook_url: webhookUrl,
  })
}

// DELETE — Telegram bağlantısını kes
export async function DELETE(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const supabase = getServiceSupabase()
  await supabase
    .from("channel_accounts")
    .delete()
    .eq("org_id", auth.org_id)
    .eq("channel", "telegram")

  return NextResponse.json({ ok: true })
}
