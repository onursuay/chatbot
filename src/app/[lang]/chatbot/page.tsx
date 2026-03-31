"use client"

import { useEffect, useState, useCallback } from "react"
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

interface KBItem {
  id: string
  title: string
  type: "text" | "url" | "faq"
  category: string
  content: string
  url?: string
  question?: string
  answer?: string
  created_at: string
}

const KB_CATEGORIES = [
  { value: "products", label: "Urunler" },
  { value: "services", label: "Hizmetler" },
  { value: "pricing", label: "Fiyatlar" },
  { value: "company", label: "Sirket Bilgisi" },
  { value: "faq", label: "SSS" },
  { value: "other", label: "Diger" },
]

export default function ChatbotPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [config, setConfig] = useState<ChatbotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"knowledge" | "behavior" | "model">("knowledge")

  // Knowledge Base states
  const [kbItems, setKbItems] = useState<KBItem[]>([])
  const [kbLoading, setKbLoading] = useState(false)
  const [kbType, setKbType] = useState<"text" | "url" | "faq">("text")
  const [kbTitle, setKbTitle] = useState("")
  const [kbContent, setKbContent] = useState("")
  const [kbUrl, setKbUrl] = useState("")
  const [kbCategory, setKbCategory] = useState("other")
  const [kbQuestion, setKbQuestion] = useState("")
  const [kbAnswer, setKbAnswer] = useState("")
  const [kbSaving, setKbSaving] = useState(false)
  const [urlFetching, setUrlFetching] = useState(false)
  const [kbError, setKbError] = useState("")
  const [kbSuccess, setKbSuccess] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadKbItems = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setKbLoading(true)
    try {
      const items = await api<KBItem[]>("/knowledge-base", { token })
      setKbItems(items)
    } catch {
      // KB endpoint may not exist yet
      setKbItems([])
    }
    setKbLoading(false)
  }, [getToken])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<ChatbotConfig>("/chatbot", { token })
      .then(setConfig)
      .catch(() => {})
      .finally(() => setLoading(false))
    loadKbItems()
  }, [getToken, loadKbItems])

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
              className={`w-11 h-6 rounded-full transition-colors relative ${config.is_active ? "bg-primary" : "bg-surface-350"}`}
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
      <div className="px-7 pt-4 border-b border-surface-300 bg-white">
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
                Isletmenizin hizmetlerini, urunlerini, fiyatlarini ve SSS bilgilerini ekleyin.
                AI asistan musteri sorularina bu bilgilere dayanarak yanit verecek. Ne kadar detayli yazarsaniz, o kadar dogru yanit verir.
              </p>
            </div>

            {/* ===== ADD NEW KNOWLEDGE ENTRY ===== */}
            <div className="ds-card p-6">
              <h3 className="ds-section-title mb-4">Yeni Bilgi Ekle</h3>

              {/* Sub-tabs for entry type */}
              <div className="flex gap-1 mb-5 border-b border-surface-300">
                {([
                  { id: "text" as const, label: "Metin", icon: "📝" },
                  { id: "url" as const, label: "Web Sitesi", icon: "🌐" },
                  { id: "faq" as const, label: "SSS", icon: "❓" },
                ] as const).map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => { setKbType(sub.id); setKbError(""); setKbSuccess("") }}
                    className={`px-3 py-2 text-caption font-bold border-b-2 transition-colors ${
                      kbType === sub.id
                        ? "border-primary text-primary"
                        : "border-transparent text-ink-tertiary hover:text-ink-secondary"
                    }`}
                  >
                    {sub.icon} {sub.label}
                  </button>
                ))}
              </div>

              {kbError && <div className="ds-badge-danger mb-3 inline-block">{kbError}</div>}
              {kbSuccess && <div className="ds-badge-success mb-3 inline-block">{kbSuccess}</div>}

              {/* TEXT entry */}
              {kbType === "text" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-caption font-bold text-ink-secondary block mb-1">Baslik</label>
                      <input
                        type="text"
                        value={kbTitle}
                        onChange={(e) => setKbTitle(e.target.value)}
                        className="ds-input w-full"
                        placeholder="Ornek: Hizmet Fiyatlari 2026"
                      />
                    </div>
                    <div>
                      <label className="text-caption font-bold text-ink-secondary block mb-1">Kategori</label>
                      <select
                        value={kbCategory}
                        onChange={(e) => setKbCategory(e.target.value)}
                        className="ds-input w-full"
                      >
                        {KB_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-caption font-bold text-ink-secondary block mb-1">Icerik</label>
                    <textarea
                      value={kbContent}
                      onChange={(e) => setKbContent(e.target.value)}
                      className="ds-input w-full min-h-[180px] resize-y"
                      placeholder="Urun detaylari, hizmet aciklamalari, sirket bilgileri..."
                    />
                  </div>
                  <button
                    disabled={kbSaving || !kbTitle.trim() || !kbContent.trim()}
                    onClick={async () => {
                      setKbSaving(true); setKbError(""); setKbSuccess("")
                      const token = getToken()
                      if (!token) { setKbSaving(false); return }
                      try {
                        await api("/knowledge-base", {
                          method: "POST", token,
                          body: JSON.stringify({ title: kbTitle, type: "text", category: kbCategory, content: kbContent }),
                        })
                        setKbTitle(""); setKbContent(""); setKbCategory("other")
                        setKbSuccess("Basariyla kaydedildi!")
                        setTimeout(() => setKbSuccess(""), 3000)
                        loadKbItems()
                      } catch (err: any) { setKbError(err.message || "Kaydedilemedi") }
                      setKbSaving(false)
                    }}
                    className="ds-btn-primary"
                  >
                    {kbSaving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              )}

              {/* URL entry */}
              {kbType === "url" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-caption font-bold text-ink-secondary block mb-1">Baslik</label>
                      <input
                        type="text"
                        value={kbTitle}
                        onChange={(e) => setKbTitle(e.target.value)}
                        className="ds-input w-full"
                        placeholder="Ornek: Ana Sayfa Icerigi"
                      />
                    </div>
                    <div>
                      <label className="text-caption font-bold text-ink-secondary block mb-1">Kategori</label>
                      <select
                        value={kbCategory}
                        onChange={(e) => setKbCategory(e.target.value)}
                        className="ds-input w-full"
                      >
                        {KB_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-caption font-bold text-ink-secondary block mb-1">URL</label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={kbUrl}
                        onChange={(e) => setKbUrl(e.target.value)}
                        className="ds-input flex-1"
                        placeholder="https://www.orneksite.com/hakkimizda"
                      />
                      <button
                        disabled={urlFetching || !kbUrl.trim()}
                        onClick={async () => {
                          setUrlFetching(true); setKbError("")
                          const token = getToken()
                          if (!token) { setUrlFetching(false); return }
                          try {
                            const res = await api<{ content: string; title?: string }>("/knowledge-base/fetch-url", {
                              method: "POST", token,
                              body: JSON.stringify({ url: kbUrl }),
                            })
                            setKbContent(res.content || "")
                            if (res.title && !kbTitle.trim()) setKbTitle(res.title)
                          } catch (err: any) { setKbError(err.message || "Icerik cekilemedi") }
                          setUrlFetching(false)
                        }}
                        className="ds-btn-primary whitespace-nowrap"
                      >
                        {urlFetching ? "Cekiliyor..." : "Icerigi Cek"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-caption font-bold text-ink-secondary block mb-1">Icerik Onizleme</label>
                    <textarea
                      value={kbContent}
                      onChange={(e) => setKbContent(e.target.value)}
                      className="ds-input w-full min-h-[180px] resize-y"
                      placeholder="URL'den cekilen icerik burada gorunecek. Duzenleyebilirsiniz."
                    />
                  </div>
                  <button
                    disabled={kbSaving || !kbTitle.trim() || !kbContent.trim()}
                    onClick={async () => {
                      setKbSaving(true); setKbError(""); setKbSuccess("")
                      const token = getToken()
                      if (!token) { setKbSaving(false); return }
                      try {
                        await api("/knowledge-base", {
                          method: "POST", token,
                          body: JSON.stringify({ title: kbTitle, type: "url", category: kbCategory, content: kbContent, url: kbUrl }),
                        })
                        setKbTitle(""); setKbContent(""); setKbUrl(""); setKbCategory("other")
                        setKbSuccess("Basariyla kaydedildi!")
                        setTimeout(() => setKbSuccess(""), 3000)
                        loadKbItems()
                      } catch (err: any) { setKbError(err.message || "Kaydedilemedi") }
                      setKbSaving(false)
                    }}
                    className="ds-btn-primary"
                  >
                    {kbSaving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              )}

              {/* FAQ entry */}
              {kbType === "faq" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-caption font-bold text-ink-secondary block mb-1">Soru</label>
                    <input
                      type="text"
                      value={kbQuestion}
                      onChange={(e) => setKbQuestion(e.target.value)}
                      className="ds-input w-full"
                      placeholder="Ornek: Kargo ucreti ne kadar?"
                    />
                  </div>
                  <div>
                    <label className="text-caption font-bold text-ink-secondary block mb-1">Cevap</label>
                    <textarea
                      value={kbAnswer}
                      onChange={(e) => setKbAnswer(e.target.value)}
                      className="ds-input w-full min-h-[120px] resize-y"
                      placeholder="Bu sorunun detayli cevabini yazin..."
                    />
                  </div>
                  <button
                    disabled={kbSaving || !kbQuestion.trim() || !kbAnswer.trim()}
                    onClick={async () => {
                      setKbSaving(true); setKbError(""); setKbSuccess("")
                      const token = getToken()
                      if (!token) { setKbSaving(false); return }
                      try {
                        await api("/knowledge-base", {
                          method: "POST", token,
                          body: JSON.stringify({
                            title: kbQuestion,
                            type: "faq",
                            category: "faq",
                            content: `S: ${kbQuestion}\nC: ${kbAnswer}`,
                            question: kbQuestion,
                            answer: kbAnswer,
                          }),
                        })
                        setKbQuestion(""); setKbAnswer("")
                        setKbSuccess("SSS basariyla kaydedildi!")
                        setTimeout(() => setKbSuccess(""), 3000)
                        loadKbItems()
                      } catch (err: any) { setKbError(err.message || "Kaydedilemedi") }
                      setKbSaving(false)
                    }}
                    className="ds-btn-primary"
                  >
                    {kbSaving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              )}
            </div>

            {/* ===== EXISTING KB ITEMS ===== */}
            <div>
              <h3 className="ds-section-title mb-3">Kayitli Bilgiler ({kbItems.length})</h3>
              {kbLoading ? (
                <div className="ds-card p-6 text-center text-ink-tertiary text-caption">Yukleniyor...</div>
              ) : kbItems.length === 0 ? (
                <div className="ds-card p-8 text-center">
                  <p className="text-ink-tertiary text-body mb-1">Henuz bilgi eklenmemis</p>
                  <p className="text-ink-muted text-caption">Yukaridaki formu kullanarak bilgi tabani olusturmaya baslayin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {kbItems.map((item) => (
                    <div key={item.id} className="ds-card p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-ui font-bold text-ink truncate">{item.title}</h4>
                          <div className="flex gap-1.5 mt-1 flex-wrap">
                            <span className={`ds-badge text-micro ${
                              item.type === "text" ? "bg-primary/10 text-primary" :
                              item.type === "url" ? "bg-accent-blue/10 text-accent-blue-deep" :
                              "bg-accent-amber/10 text-accent-amber-deep"
                            }`}>
                              {item.type === "text" ? "Metin" : item.type === "url" ? "URL" : "SSS"}
                            </span>
                            <span className="ds-badge text-micro bg-surface-200 text-ink-tertiary">
                              {KB_CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
                            </span>
                          </div>
                        </div>
                        <button
                          disabled={deletingId === item.id}
                          onClick={async () => {
                            if (!confirm("Bu bilgiyi silmek istediginize emin misiniz?")) return
                            setDeletingId(item.id)
                            const token = getToken()
                            if (!token) { setDeletingId(null); return }
                            try {
                              await api(`/knowledge-base/${item.id}`, { method: "DELETE", token })
                              setKbItems((prev) => prev.filter((i) => i.id !== item.id))
                            } catch { /* silent */ }
                            setDeletingId(null)
                          }}
                          className="text-ink-muted hover:text-red-500 transition-colors p-1 shrink-0"
                          title="Sil"
                        >
                          {deletingId === item.id ? "..." : "✕"}
                        </button>
                      </div>
                      <p className="text-caption text-ink-secondary line-clamp-3">
                        {item.content.slice(0, 150)}{item.content.length > 150 ? "..." : ""}
                      </p>
                      <p className="text-micro text-ink-muted mt-auto">
                        {new Date(item.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ===== LEGACY TEXTAREA ===== */}
            <div className="ds-card p-6 opacity-80">
              <h3 className="ds-section-title mb-1">Genel Isletme Bilgileri (Eski)</h3>
              <p className="text-caption text-ink-muted mb-4">
                Onceden girilen isletme bilgileri. Yeni bilgi tabani sistemini kullanmanizi oneriyoruz.
              </p>
              <textarea
                value={config.knowledge_base || ""}
                onChange={(e) => setConfig({ ...config, knowledge_base: e.target.value })}
                className="ds-input w-full min-h-[200px] resize-y font-mono text-[13px] leading-relaxed"
                placeholder="Isletme bilgilerinizi buraya yazin..."
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
                        : "border-surface-300 hover:border-surface-300"
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
                    onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 1024 })}
                    className="ds-input w-full"
                    min={50} max={4096}
                  />
                  <p className="text-micro text-ink-muted mt-1">50-4096 arasi. Oneri: 1024</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
