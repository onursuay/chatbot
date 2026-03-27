"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface Template {
  id?: string
  name: string
  status: string
  category: string
  language: string
  components?: any[]
}

export default function TemplatesPage() {
  const { getToken } = useAuth()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: "", text: "", category: "MARKETING", language: "tr" })

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<Template[]>("/templates", { token })
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [getToken])

  const handleCreate = async () => {
    if (!form.name || !form.text) return alert("Sablon adi ve metin zorunlu")
    const token = getToken()
    if (!token) return
    setCreating(true)
    try {
      await api("/templates", {
        method: "POST", token,
        body: JSON.stringify(form),
      })
      // Listeyi yenile
      const updated = await api<Template[]>("/templates", { token })
      setTemplates(updated)
      setShowCreate(false)
      setForm({ name: "", text: "", category: "MARKETING", language: "tr" })
    } catch (err: any) {
      alert(err.message || "Sablon olusturulamadi")
    }
    setCreating(false)
  }

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      APPROVED: "bg-green-500/10 text-green-400",
      PENDING: "bg-yellow-500/10 text-yellow-400",
      REJECTED: "bg-red-500/10 text-red-400",
      DRAFT: "bg-dark-700 text-dark-400",
    }
    return map[s] || "bg-dark-700 text-dark-400"
  }

  const categoryLabel = (c: string) => {
    const map: Record<string, string> = { MARKETING: "Pazarlama", UTILITY: "Bildirim", AUTHENTICATION: "Dogrulama" }
    return map[c] || c
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Mesaj Sablonlari</h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-4 py-2 rounded-lg text-sm transition">
          + Yeni Sablon
        </button>
      </div>

      {showCreate && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-medium mb-4">Yeni Sablon Olustur</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1">Sablon Adi (kucuk harf, alt cizgi)</label>
              <input type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                placeholder="ornek: hosgeldin_mesaji" />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Kategori</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
                <option value="MARKETING">Pazarlama</option>
                <option value="UTILITY">Bildirim</option>
                <option value="AUTHENTICATION">Dogrulama</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-dark-400 mb-1">Mesaj Metni</label>
            <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 h-24 resize-none"
              placeholder="Merhaba {{1}}, size ozel kampanyamiz var!" />
            <p className="text-xs text-dark-600 mt-1">Degiskenler icin {"{{1}}"}, {"{{2}}"} kullanin</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating}
              className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-6 py-2 rounded-lg text-sm transition disabled:opacity-50">
              {creating ? "Gonderiliyor..." : "Meta'ya Gonder"}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="bg-dark-800 text-dark-300 hover:text-white px-4 py-2 rounded-lg text-sm transition">Iptal</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-dark-400 text-sm">Yukleniyor...</p> : templates.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
          <p className="text-dark-400">Henuz sablon yok</p>
          <p className="text-dark-600 text-sm mt-1">Broadcast gonderimi icin onaylanmis sablon gereklidir</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t, i) => (
            <div key={t.name + i} className="bg-dark-900 border border-dark-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-medium text-sm">{t.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusColor(t.status)}`}>{t.status}</span>
              </div>
              <div className="flex gap-2 text-xs text-dark-500">
                <span>{categoryLabel(t.category)}</span>
                <span>{t.language}</span>
              </div>
              {t.components && t.components.length > 0 && (
                <p className="text-xs text-dark-400 mt-2 line-clamp-2">
                  {t.components.find((c: any) => c.type === "BODY")?.text || ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
