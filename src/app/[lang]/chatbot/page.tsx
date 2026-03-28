"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface ChatbotConfig {
  id: string
  name: string
  is_active: boolean
  ai_provider: string
  ai_model: string
  system_prompt: string
  knowledge_base: string | null
  temperature: number
  max_tokens: number
  welcome_message: string | null
  transfer_keywords: string[]
  close_keywords: string[]
  business_hours: Record<string, any> | null
  out_of_hours_message: string | null
}

export default function ChatbotPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [config, setConfig] = useState<ChatbotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"knowledge" | "behavior" | "model">("knowledge")

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<ChatbotConfig>("/chatbot", { token })
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [getToken])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setSaved(false)
    setError("")

    const token = getToken()
    if (!token) return

    try {
      const updated = await api<ChatbotConfig>("/chatbot", {
        method: "PATCH",
        token,
        body: JSON.stringify({
          system_prompt: config.system_prompt,
          knowledge_base: config.knowledge_base,
          ai_model: config.ai_model,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          welcome_message: config.welcome_message,
          is_active: config.is_active,
          transfer_keywords: config.transfer_keywords,
          out_of_hours_message: config.out_of_hours_message,
        }),
      })
      setConfig(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || "Kaydedilemedi")
    }
    setSaving(false)
  }

  if (loading) return <div className="p-7 text-ink-tertiary text-body">{t("loading")}</div>
  if (!config) return <div className="p-7 text-ink-tertiary text-body">Chatbot ayarlari yuklenemedi.</div>

  const tabs = [
    { id: "knowledge" as const, label: "Bilgi Tabani", icon: "📚" },
    { id: "behavior" as const, label: "Davranis", icon: "🤖" },
    { id: "model" as const, label: "Model Ayarlari", icon: "⚙️" },
  ]

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("chatbot_settings")}</h2>
          <p className="ds-page-subtitle">AI asistan yapilandirmasi ve bilgi tabani</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Aktif/Pasif Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-caption text-ink-tertiary">{config.is_active ? "Aktif" : "Pasif"}</span>
            <button
              onClick={() => setConfig({ ...config, is_active: !config.is_active })}
              className={`w-11 h-6 rounded-full transition-colors relative ${config.is_active ? "bg-primary" : "bg-surface-400"}`}
            >
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-card transition-all ${config.is_active ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          {saved && <span className="ds-badge-success">Kaydedildi</span>}
          {error && <span className="ds-badge-danger">{error}</span>}
          <button onClick={handleSave} disabled={saving} className="ds-btn-primary">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-7 pt-4 border-b border-surface-300 bg-surface-200">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-ui font-bold rounded-t-btn border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-ink-tertiary hover:text-ink-secondary"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-7 max-w-4xl">
        {/* ===== BILGI TABANI ===== */}
        {activeTab === "knowledge" && (
          <div className="space-y-6">
            <div className="ds-callout-info">
              <p className="text-ui text-accent-blue-deep font-bold mb-1">Bilgi Tabani Nedir?</p>
              <p className="text-caption text-ink-secondary">
                Buraya isletmenizin hizmetlerini, urunlerini, fiyatlarini, calisma saatlerini ve sik sorulan sorulari yazin.
                AI asistan musteri sorularina bu bilgilere dayanarak yanit verecek. Ne kadar detayli yazarsaniz, o kadar dogru yanit verir.
              </p>
            </div>

            <div className="ds-card p-6">
              <h3 className="ds-section-title mb-1">Isletme Bilgileri & Hizmetler</h3>
              <p className="text-caption text-ink-muted mb-4">
                Hizmetlerinizi, fiyatlarinizi, calisma saatlerinizi, adresinizi ve SSS'leri asagiya yazin.
              </p>
              <textarea
                value={config.knowledge_base || ""}
                onChange={(e) => setConfig({ ...config, knowledge_base: e.target.value })}
                className="ds-input w-full min-h-[350px] resize-y font-mono text-[13px] leading-relaxed"
                placeholder={`Ornek:

ISLETME: TOD Okullari
ADRES: Istanbul, Besiktas
TELEFON: +90 212 xxx xx xx
WEB: www.todokullari.com

HIZMETLER:
- Anaokulu (3-6 yas): Aylik 15.000 TL
- Ilkokul (6-10 yas): Aylik 18.000 TL
- Ortaokul (10-14 yas): Aylik 20.000 TL

CALISMA SAATLERI:
Pazartesi-Cuma: 08:00 - 17:00
Cumartesi: 09:00 - 13:00 (sadece kayit isleri)
Pazar: Kapali

KAYIT SURECI:
1. Online basvuru formu doldurun
2. Okul turu icin randevu alin
3. Mulakat ve degerlendirme
4. Kayit onay ve odeme

SSS:
S: Servis var mi?
C: Evet, Besiktas, Sisli, Sariyer bolgelerinde ucretsiz servis mevcuttur.

S: Yemek dahil mi?
C: Evet, sabah kahvaltisi, ogle yemegi ve ara ogun dahildir.

S: Indirim var mi?
C: Kardes indirimi %10, erken kayit indirimi %5 uygulanmaktadir.`}
              />
            </div>
          </div>
        )}

        {/* ===== DAVRANIS ===== */}
        {activeTab === "behavior" && (
          <div className="space-y-6">
            <div className="ds-card p-6">
              <h3 className="ds-section-title mb-1">AI Kisilik & Talimatlar</h3>
              <p className="text-caption text-ink-muted mb-4">
                AI'nin nasil davranacagini, hangi tonda konusacagini, nelere dikkat edecegini tanimlayin.
              </p>
              <textarea
                value={config.system_prompt}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                className="ds-input w-full min-h-[160px] resize-y"
                placeholder="Ornek: Sen TOD Okullari'nin WhatsApp asistanisin. Velilere sicak ve bilgilendirici yanit ver. Kayit sureciyle ilgili detayli bilgi ver. Fiyat soruldiginda guncel fiyatlari paylasir."
              />
            </div>

            <div className="ds-card p-6">
              <h3 className="ds-section-title mb-1">Karsilama Mesaji</h3>
              <p className="text-caption text-ink-muted mb-4">
                Musteri ilk kez yazdiginda gonderilecek karsilama mesaji.
              </p>
              <textarea
                value={config.welcome_message || ""}
                onChange={(e) => setConfig({ ...config, welcome_message: e.target.value || null })}
                className="ds-input w-full min-h-[80px] resize-y"
                placeholder="Merhaba! TOD Okullari'na hosgeldiniz. Size nasil yardimci olabilirim?"
              />
            </div>

            <div className="ds-card p-6">
              <h3 className="ds-section-title mb-1">Mesai Disi Mesaji</h3>
              <p className="text-caption text-ink-muted mb-4">
                Calisma saatleri disinda gelen mesajlara otomatik yanit.
              </p>
              <textarea
                value={config.out_of_hours_message || ""}
                onChange={(e) => setConfig({ ...config, out_of_hours_message: e.target.value || null })}
                className="ds-input w-full min-h-[80px] resize-y"
                placeholder="Su an mesai saatleri disindayiz. En kisa surede size donus yapacagiz. Acil durumlar icin: 0212 xxx xx xx"
              />
            </div>

            <div className="ds-card p-6">
              <h3 className="ds-section-title mb-1">Yetkili Aktarma Kelimeleri</h3>
              <p className="text-caption text-ink-muted mb-4">
                Musteri bu kelimelerden birini yazarsa konusma otomatik olarak yetkili kisiye aktarilir.
              </p>
              <input
                type="text"
                value={config.transfer_keywords.join(", ")}
                onChange={(e) => setConfig({
                  ...config,
                  transfer_keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                })}
                className="ds-input w-full"
                placeholder="yetkili, mudur, sube, sikayet, insan"
              />
              <p className="text-micro text-ink-muted mt-2">Virgul ile ayirin</p>
            </div>
          </div>
        )}

        {/* ===== MODEL AYARLARI ===== */}
        {activeTab === "model" && (
          <div className="space-y-6">
            <div className="ds-card p-6">
              <h3 className="ds-section-title mb-4">AI Model Secimi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Hizli, ekonomik" },
                  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "En akilli, pahali" },
                  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Stabil, dengeli" },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setConfig({ ...config, ai_model: m.value })}
                    className={`p-4 rounded-[6px] border text-left transition-colors ${
                      config.ai_model === m.value
                        ? "border-primary bg-primary/5"
                        : "border-surface-300 hover:border-surface-400"
                    }`}
                  >
                    <p className={`text-ui font-bold ${config.ai_model === m.value ? "text-primary" : "text-ink"}`}>{m.label}</p>
                    <p className="text-micro text-ink-muted mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="ds-card p-6">
              <h3 className="ds-section-title mb-4">Yanitlama Parametreleri</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-caption font-bold text-ink-secondary block mb-2">
                    Yaraticilik (Temperature): {config.temperature}
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-micro text-ink-muted mt-1">
                    <span>Tutarli</span>
                    <span>Yaratici</span>
                  </div>
                </div>
                <div>
                  <label className="text-caption font-bold text-ink-secondary block mb-2">
                    Maks. Token (Yanit Uzunlugu)
                  </label>
                  <input
                    type="number"
                    value={config.max_tokens}
                    onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 300 })}
                    className="ds-input w-full"
                    min={50} max={2000}
                  />
                  <p className="text-micro text-ink-muted mt-1">50-2000 arasi. Oneri: 300</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
