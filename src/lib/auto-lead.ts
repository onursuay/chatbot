import { getServiceSupabase } from "@/lib/supabase"

/**
 * Yeni konuşma oluşturulduğunda otomatik olarak pipeline'ın
 * ilk aşamasına (Yeni) bir lead ekler.
 * Aynı kişi için zaten lead varsa tekrar oluşturmaz.
 */
export async function autoCreateLead(orgId: string, contactId: string): Promise<void> {
  try {
    const supabase = getServiceSupabase()

    // Org'un ilk aktif pipeline'ını al
    const { data: pipelines } = await supabase
      .from("pipelines")
      .select("id, pipeline_stages(id, sort_order, is_win, is_loss)")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)

    if (!pipelines || pipelines.length === 0) return

    const pipeline = pipelines[0]

    // İlk aşamayı bul (Kazanıldı/Kaybedildi hariç, en düşük sort_order)
    const firstStage = (pipeline.pipeline_stages || [])
      .filter((s: any) => !s.is_win && !s.is_loss)
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0]

    if (!firstStage) return

    // Bu contact için bu pipeline'da zaten lead var mı?
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("org_id", orgId)
      .eq("contact_id", contactId)
      .eq("pipeline_id", pipeline.id)
      .maybeSingle()

    if (existing) return // Zaten var, tekrar oluşturma

    // Contact bilgisini al
    const { data: contact } = await supabase
      .from("contacts")
      .select("name, wa_id, phone")
      .eq("id", contactId)
      .single()

    const title = contact?.name || contact?.phone || contact?.wa_id || "Yeni Müşteri"

    await supabase.from("leads").insert({
      org_id: orgId,
      title,
      pipeline_id: pipeline.id,
      stage_id: firstStage.id,
      contact_id: contactId,
      status: "active",
      value: 0,
      currency: "TRY",
      attributes: {},
      tags: [],
      score: 0,
    })
  } catch (err) {
    // Lead oluşturma hatası konuşmayı engellememeli
    console.error("[AUTO_LEAD] Otomatik lead oluşturulamadı:", err)
  }
}
