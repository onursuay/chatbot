import { NextResponse } from "next/server"
import { getServiceSupabase } from "@/lib/supabase"
import { getAuthUser } from "@/lib/jwt"

const META_APP_ID = process.env.META_APP_ID || ""
const META_APP_SECRET = process.env.META_APP_SECRET || ""
const GRAPH_API_VERSION = "v21.0"
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  try {
    const { code } = await request.json()

    // 1. Code → Access Token
    const tokenData = await exchangeCodeForToken(code)
    const accessToken = tokenData.access_token

    // 2. Shared WABA'ları al
    const wabaIds = await getSharedWabas(accessToken)
    if (!wabaIds.length) {
      return NextResponse.json(
        { detail: "WhatsApp Business hesabi bulunamadi." },
        { status: 400 }
      )
    }

    const wabaId = wabaIds[0]

    // 3. WABA detayları
    const wabaDetails = await getWabaDetails(accessToken, wabaId)
    const businessId = wabaDetails.on_behalf_of_business_info?.id || null

    // 4. Telefon numaralarını al
    const phoneNumbers = await getPhoneNumbers(accessToken, wabaId)
    if (!phoneNumbers.length) {
      return NextResponse.json(
        { detail: "Henuz bir telefon numarasi eklenmemis." },
        { status: 400 }
      )
    }

    const phone = phoneNumbers[0]

    // 5. WABA'yı subscribe et
    await subscribeWaba(accessToken, wabaId)

    // 6. Phone register
    await registerPhoneNumber(accessToken, phone.id)

    // 7. DB'ye kaydet
    const supabase = getServiceSupabase()

    // Mevcut WABA var mı?
    const { data: existingWaba } = await supabase
      .from("waba_accounts")
      .select("*")
      .eq("waba_id", wabaId)
      .single()

    let wabaRecord: any

    if (existingWaba) {
      const { data } = await supabase
        .from("waba_accounts")
        .update({
          access_token: accessToken,
          is_active: true,
          business_id: businessId,
        })
        .eq("id", existingWaba.id)
        .select()
        .single()
      wabaRecord = data
    } else {
      const { data } = await supabase
        .from("waba_accounts")
        .insert({
          org_id: auth.org_id,
          waba_id: wabaId,
          name: wabaDetails.name || "WhatsApp Business",
          access_token: accessToken,
          business_id: businessId,
          is_active: true,
        })
        .select()
        .single()
      wabaRecord = data
    }

    // Telefon numarasını kaydet
    const { data: existingPhone } = await supabase
      .from("phone_numbers")
      .select("*")
      .eq("phone_number_id", phone.id)
      .single()

    if (existingPhone) {
      await supabase
        .from("phone_numbers")
        .update({
          display_number: phone.display_phone_number,
          verified_name: phone.verified_name || null,
          is_active: true,
        })
        .eq("id", existingPhone.id)
    } else {
      await supabase.from("phone_numbers").insert({
        waba_id: wabaRecord.id,
        org_id: auth.org_id,
        phone_number_id: phone.id,
        display_number: phone.display_phone_number,
        verified_name: phone.verified_name || null,
        quality_rating: phone.quality_rating || "GREEN",
        status: "CONNECTED",
        is_active: true,
      })
    }

    // Organization güncelle
    if (businessId) {
      await supabase
        .from("organizations")
        .update({ meta_business_id: businessId })
        .eq("id", auth.org_id)
    }

    return NextResponse.json({
      waba_id: wabaId,
      phone_number: phone.display_phone_number,
      phone_number_id: phone.id,
      verified_name: phone.verified_name || null,
      message: "WhatsApp hesabi basariyla baglandi",
    })
  } catch (e: any) {
    console.error("Embedded signup error:", e)
    return NextResponse.json(
      { detail: e.message || "Baglanti hatasi" },
      { status: 500 }
    )
  }
}

async function exchangeCodeForToken(code: string) {
  const url = `${GRAPH_BASE}/oauth/access_token?client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&code=${code}`
  const res = await fetch(url)
  const data = await res.json()
  if (!data.access_token) throw new Error("Facebook token alinamadi.")
  return data
}

async function getSharedWabas(accessToken: string): Promise<string[]> {
  const url = `${GRAPH_BASE}/debug_token?input_token=${accessToken}&access_token=${META_APP_ID}|${META_APP_SECRET}`
  const res = await fetch(url)
  const data = await res.json()

  const scopes = data.data?.granular_scopes || []
  for (const scope of scopes) {
    if (scope.scope === "whatsapp_business_management") {
      return scope.target_ids || []
    }
  }

  // Fallback
  const bizRes = await fetch(`${GRAPH_BASE}/me/businesses`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const bizData = await bizRes.json()

  const wabaIds: string[] = []
  for (const biz of bizData.data || []) {
    const wabaRes = await fetch(
      `${GRAPH_BASE}/${biz.id}/owned_whatsapp_business_accounts`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const wabaData = await wabaRes.json()
    for (const waba of wabaData.data || []) {
      wabaIds.push(waba.id)
    }
  }
  return wabaIds
}

async function getWabaDetails(accessToken: string, wabaId: string) {
  const res = await fetch(
    `${GRAPH_BASE}/${wabaId}?fields=name,on_behalf_of_business_info,currency,timezone_id`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return res.json()
}

async function getPhoneNumbers(accessToken: string, wabaId: string) {
  const res = await fetch(
    `${GRAPH_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return data.data || []
}

async function subscribeWaba(accessToken: string, wabaId: string) {
  await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}

async function registerPhoneNumber(accessToken: string, phoneNumberId: string) {
  try {
    await fetch(`${GRAPH_BASE}/${phoneNumberId}/register`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", pin: "123456" }),
    })
  } catch {
    // Muhtemelen zaten kayıtlı
  }
}
