"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

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
  const { t } = useI18n()
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
    ]).then(([b, tpl]) => {
      setBroadcasts(b)
      setTemplates((tpl || []).filter((item: Template) => item.status === "APPROVED"))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [getToken])

  const handleSend = async () => {
    if (!form.template_name) return alert(t("select_template"))
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
    } catch (err: any) { alert(err.message || t("failed")) }
    setSending(false)
  }

  const statusMap: Record<string, { key: string; color: string }> = {
    draft: { key: "draft", color: "text-gray-500" },
    scheduled: { key: "scheduled", color: "text-yellow-400" },
    sending: { key: "sending", color: "text-blue-400" },
    completed: { key: "completed", color: "text-primary" },
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t("broadcast")}</h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm transition">
          {t("new_campaign")}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-gray-900 font-medium mb-4">{t("new_campaign_form")}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t("campaign_name")}</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
                placeholder={t("example_campaign")} />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t("message_template")}</label>
              <select value={form.template_name} onChange={(e) => setForm({ ...form, template_name: e.target.value })}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary">
                <option value="">{t("select_template")}</option>
                {templates.map((tpl) => (
                  <option key={tpl.name} value={tpl.name}>{tpl.name} ({tpl.category})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t("language")}</label>
              <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary">
                <option value="tr">{t("turkish")}</option>
                <option value="en_US">English</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t("target_tag")}</label>
              <input type="text" value={form.tag_filter} onChange={(e) => setForm({ ...form, tag_filter: e.target.value })}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
                placeholder={t("tag_empty_hint")} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSend} disabled={sending}
              className="bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-6 py-2 rounded-lg text-sm transition disabled:opacity-50">
              {sending ? t("sending") : t("send_now")}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="bg-gray-100 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition">{t("cancel")}</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-500 text-sm">{t("loading")}</p> : broadcasts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500">{t("no_campaigns")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("no_campaigns_desc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => {
            const s = statusMap[b.status] || { key: b.status, color: "text-gray-500" }
            return (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-gray-900 font-medium">{b.name}</h3>
                  <span className={`text-xs font-medium ${s.color}`}>{t(s.key)}</span>
                </div>
                <div className="grid grid-cols-5 gap-4 text-center">
                  {[
                    { v: b.total_recipients, l: "recipients", c: "text-gray-900" },
                    { v: b.sent_count, l: "sent", c: "text-primary" },
                    { v: b.delivered_count, l: "delivered", c: "text-blue-400" },
                    { v: b.read_count, l: "read", c: "text-purple-400" },
                    { v: b.failed_count, l: "failed", c: "text-red-400" },
                  ].map((stat) => (
                    <div key={stat.l}>
                      <p className={`text-2xl font-bold ${stat.c}`}>{stat.v}</p>
                      <p className="text-xs text-gray-400">{t(stat.l)}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">
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
