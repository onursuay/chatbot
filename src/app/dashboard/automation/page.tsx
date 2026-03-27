"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

interface Automation {
  id: string
  name: string
  trigger_type: string
  trigger_config: any
  action_type: string
  action_config: any
  is_active: boolean
  priority: number
}

const TRIGGER_TYPES = [
  { value: "keyword", label: "Anahtar Kelime", desc: "Belirli kelime iceren mesajlarda tetiklenir" },
  { value: "first_message", label: "İlk Mesaj", desc: "Yeni konusma başladığında tetiklenir" },
  { value: "business_hours", label: "Mesai Disi", desc: "Mesai saatleri disinda tetiklenir" },
]

const ACTION_TYPES = [
  { value: "send_message", label: "Mesaj Gönder" },
  { value: "send_template", label: "Şablon Gönder" },
  { value: "assign_agent", label: "Agent'a Ata" },
  { value: "add_tag", label: "Etiket Ekle" },
  { value: "enable_bot", label: "Bot'u Ac" },
  { value: "disable_bot", label: "Bot'u Kapat" },
]

export default function AutomationPage() {
  const { user } = useAuth()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{
    name: string
    trigger_type: string
    trigger_config: Record<string, any>
    action_type: string
    action_config: Record<string, any>
  }>({
    name: "",
    trigger_type: "keyword",
    trigger_config: { keywords: "" },
    action_type: "send_message",
    action_config: { message: "" },
  })

  const loadAutomations = async () => {
    if (!user?.org_id) return
    const { data } = await supabase.from("automations").select("*").eq("org_id", user.org_id).order("priority", { ascending: false })
    setAutomations(data || [])
    setLoading(false)
  }

  useEffect(() => { loadAutomations() }, [user])

  const handleCreate = async () => {
    if (!form.name) return alert("Otomasyon adı zorunlu")
    if (!user?.org_id) return
    setSaving(true)
    const triggerConfig = form.trigger_type === "keyword"
      ? { keywords: form.trigger_config.keywords.split(",").map((k: string) => k.trim()) }
      : form.trigger_config
    await supabase.from("automations").insert({
      org_id: user.org_id,
      name: form.name,
      trigger_type: form.trigger_type,
      trigger_config: triggerConfig,
      action_type: form.action_type,
      action_config: form.action_config,
      is_active: true,
    })
    setShowCreate(false)
    setForm({ name: "", trigger_type: "keyword", trigger_config: { keywords: "" }, action_type: "send_message", action_config: { message: "" } })
    loadAutomations()
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("automations").update({ is_active: !current }).eq("id", id)
    loadAutomations()
  }

  const deleteAutomation = async (id: string) => {
    if (!confirm("Bu otomasyonu silmek istediğinize emin misiniz?")) return
    await supabase.from("automations").delete().eq("id", id)
    loadAutomations()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Otomasyon Kurallari</h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-4 py-2 rounded-lg text-sm transition">
          + Yeni Kural
        </button>
      </div>

      {showCreate && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-medium mb-4">Yeni Otomasyon Kurali</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1">Kural Adi</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                placeholder="Ornek: Hosgeldin mesaji" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-dark-400 mb-1">Tetikleyici</label>
                <select value={form.trigger_type} onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
                  {TRIGGER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <p className="text-xs text-dark-600 mt-1">
                  {TRIGGER_TYPES.find((t) => t.value === form.trigger_type)?.desc}
                </p>
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Aksiyon</label>
                <select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
                  {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            </div>
            {form.trigger_type === "keyword" && (
              <div>
                <label className="block text-sm text-dark-400 mb-1">Anahtar Kelimeler (virgul ile ayirin)</label>
                <input type="text" value={form.trigger_config.keywords}
                  onChange={(e) => setForm({ ...form, trigger_config: { keywords: e.target.value } })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="fiyat, kampanya, indirim" />
              </div>
            )}
            {(form.action_type === "send_message") && (
              <div>
                <label className="block text-sm text-dark-400 mb-1">Gonderilecek Mesaj</label>
                <textarea value={form.action_config.message}
                  onChange={(e) => setForm({ ...form, action_config: { message: e.target.value } })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 h-20 resize-none"
                  placeholder="Merhaba! Fiyat bilgisi için..." />
              </div>
            )}
            {form.action_type === "add_tag" && (
              <div>
                <label className="block text-sm text-dark-400 mb-1">Eklenecek Etiket</label>
                <input type="text" value={form.action_config.tag || ""}
                  onChange={(e) => setForm({ ...form, action_config: { tag: e.target.value } })}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  placeholder="vip" />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} disabled={saving}
              className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-6 py-2 rounded-lg text-sm transition disabled:opacity-50">
              {saving ? "Kaydediliyor..." : "Oluştur"}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="bg-dark-800 text-dark-300 hover:text-white px-4 py-2 rounded-lg text-sm transition">İptal</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-dark-400 text-sm">Yükleniyor...</p> : automations.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
          <p className="text-dark-400">Henüz otomasyon kuralı yok</p>
          <p className="text-dark-600 text-sm mt-1">Keyword tetikleyiciler, hoşgeldin mesajları ve daha fazlasi</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a.id} className="bg-dark-900 border border-dark-800 rounded-xl p-5 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-medium">{a.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${a.is_active ? "bg-brand-500/10 text-brand-400" : "bg-dark-700 text-dark-500"}`}>
                    {a.is_active ? "Aktif" : "Pasif"}
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-dark-500">
                  <span>Tetikleyici: {TRIGGER_TYPES.find((t) => t.value === a.trigger_type)?.label || a.trigger_type}</span>
                  <span>Aksiyon: {ACTION_TYPES.find((t) => t.value === a.action_type)?.label || a.action_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(a.id, a.is_active)}
                  className={`w-10 h-5 rounded-full transition relative ${a.is_active ? "bg-brand-500" : "bg-dark-700"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition ${a.is_active ? "left-5" : "left-0.5"}`} />
                </button>
                <button onClick={() => deleteAutomation(a.id)}
                  className="text-dark-600 hover:text-red-400 transition text-sm ml-2">Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
