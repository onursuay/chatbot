"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

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
  const { t } = useI18n()
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
    if (!form.name || !form.text) return alert(t("template_name") + " & " + t("message_text"))
    const token = getToken()
    if (!token) return
    setCreating(true)
    try {
      await api("/templates", {
        method: "POST", token,
        body: JSON.stringify(form),
      })
      const updated = await api<Template[]>("/templates", { token })
      setTemplates(updated)
      setShowCreate(false)
      setForm({ name: "", text: "", category: "MARKETING", language: "tr" })
    } catch (err: any) {
      alert(err.message || t("failed"))
    }
    setCreating(false)
  }

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      APPROVED: "bg-green-500/10 text-green-400",
      PENDING: "bg-yellow-500/10 text-yellow-400",
      REJECTED: "bg-red-500/10 text-red-400",
      DRAFT: "bg-gray-200 text-gray-500",
    }
    return map[s] || "bg-gray-200 text-gray-500"
  }

  const categoryLabel = (c: string) => {
    const map: Record<string, string> = { MARKETING: t("marketing"), UTILITY: t("utility"), AUTHENTICATION: t("authentication") }
    return map[c] || c
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t("templates")}</h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm transition">
          {t("new_template")}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-gray-900 font-medium mb-4">{t("new_template_form")}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t("template_name")}</label>
              <input type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
                placeholder={t("example_template")} />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t("category")}</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary">
                <option value="MARKETING">{t("marketing")}</option>
                <option value="UTILITY">{t("utility")}</option>
                <option value="AUTHENTICATION">{t("authentication")}</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-500 mb-1">{t("message_text")}</label>
            <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary h-24 resize-none"
              placeholder={t("msg_body_placeholder")} />
            <p className="text-xs text-gray-400 mt-1">{t("variables_hint")}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating}
              className="bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-6 py-2 rounded-lg text-sm transition disabled:opacity-50">
              {creating ? t("sending") : t("send_to_meta")}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="bg-gray-100 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition">{t("cancel")}</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-500 text-sm">{t("loading")}</p> : templates.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500">{t("no_templates")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("no_templates_desc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl, i) => (
            <div key={tpl.name + i} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-900 font-medium text-sm">{tpl.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusColor(tpl.status)}`}>{t(`status_${tpl.status.toLowerCase()}`) || tpl.status}</span>
              </div>
              <div className="flex gap-2 text-xs text-gray-400">
                <span>{categoryLabel(tpl.category)}</span>
                <span>{tpl.language}</span>
              </div>
              {tpl.components && tpl.components.length > 0 && (
                <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                  {tpl.components.find((c: any) => c.type === "BODY")?.text || ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
