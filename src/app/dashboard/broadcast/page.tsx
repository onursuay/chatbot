"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface Broadcast {
  id: string
  name: string
  status: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  read_count: number
  failed_count: number
  created_at: string
}

interface Template {
  name: string
  status: string
  category: string
}

export default function BroadcastPage() {
  const { getToken } = useAuth()
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ name: "", template_name: "", language: "tr", tag_filter: "" })

  useEffect(() => {
    const token = getToken()
    if (!token) return
    Promise.all([
      api<Broadcast[]>("/broadcasts", { token }),
      api<Template[]>("/templates", { token }).catch(() => []),
    ]).then(([b, t]) => {
      setBroadcasts(b)
      setTemplates((t || []).filter((tpl: Template) => tpl.status === "APPROVED"))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [getToken])

  const handleSend = async () => {
    if (!form.template_name) return alert("Sablon secin")
    const token = getToken()
    if (!token) return
    setSending(true)
    try {
      const result = await api<Broadcast>("/broadcasts", {
        method: "POST", token, body: JSON.stringify(form),
      })
      setBroadcasts((prev) => [result, ...prev])
      setShowCreate(false)
      setForm({ name: "", template_name: "", language: "tr", tag_filter: "" })
    } catch (err: any) { alert(err.message || "Gonderim hatasi") }
    setSending(false)
  }

  const statusMap: Record<string, { text: string; color: string }> = {
    draft: { text: "Taslak", color: "text-dark-400" },
    scheduled: { text: "Zamanlanmis", color: "text-yellow-400" },
    sending: { text: "Gonderiliyor", color: "text-blue-400" },
    completed: { text: "Tamamlandi", color: "text-brand-400" },
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Broadcast / Kampanya</h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-4 py-2 rounded-lg text-sm transition">
          + Yeni Kampanya
        </button>
      </div>

      {showCreate && (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 mb-6">
          <h3 className="text-white font-medium mb-4">Yeni Kampanya</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1">Kampanya Adi</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                placeholder="Ornek: Yilbasi Kampanyasi" />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Mesaj Sablonu</label>
              <select value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
                <option value="">Sablon Secin</option>
                {templates.map((t) => (
                  <option key={t.name} value={t.name}>{t.name} ({t.category})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Dil</label>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
                <option value="tr">Turkce</option>
                <option value="en_US">English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Hedef Etiket (opsiyonel)</label>
              <input type="text" value={form.tag_filter} onChange={(e) => setForm({ ...form, tag_filter: e.target.value })}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                placeholder="Bos birakirsaniz tum kisilere gider" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSend} disabled={sending}
              className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-6 py-2 rounded-lg text-sm transition disabled:opacity-50">
              {sending ? "Gonderiliyor..." : "Hemen Gonder"}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="bg-dark-800 text-dark-300 hover:text-white px-4 py-2 rounded-lg text-sm transition">Iptal</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-dark-400 text-sm">Yukleniyor...</p> : broadcasts.length === 0 ? (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
          <p className="text-dark-400">Henuz kampanya yok</p>
          <p className="text-dark-600 text-sm mt-1">Yeni kampanya olusturup toplu mesaj gonderin</p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => {
            const s = statusMap[b.status] || { text: b.status, color: "text-dark-400" }
            return (
              <div key={b.id} className="bg-dark-900 border border-dark-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-medium">{b.name}</h3>
                  <span className={`text-xs font-medium ${s.color}`}>{s.text}</span>
                </div>
                <div className="grid grid-cols-5 gap-4 text-center">
                  {[
                    { v: b.total_recipients, l: "Alici", c: "text-white" },
                    { v: b.sent_count, l: "Gonderildi", c: "text-brand-400" },
                    { v: b.delivered_count, l: "Teslim", c: "text-blue-400" },
                    { v: b.read_count, l: "Okundu", c: "text-purple-400" },
                    { v: b.failed_count, l: "Basarisiz", c: "text-red-400" },
                  ].map((stat) => (
                    <div key={stat.l}>
                      <p className={`text-2xl font-bold ${stat.c}`}>{stat.v}</p>
                      <p className="text-xs text-dark-500">{stat.l}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-dark-600 mt-3">
                  {new Date(b.created_at).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
