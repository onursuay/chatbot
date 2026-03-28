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
      APPROVED: "ds-badge-success",
      PENDING: "ds-badge-warning",
      REJECTED: "ds-badge-danger",
      DRAFT: "ds-badge-neutral",
    }
    return map[s] || "ds-badge-neutral"
  }

  const categoryLabel = (c: string) => {
    const map: Record<string, string> = { MARKETING: t("marketing"), UTILITY: t("utility"), AUTHENTICATION: t("authentication") }
    return map[c] || c
  }

  return (
    <div className="p-7">
      <div className="ds-page-header">
        <h2 className="ds-page-title">{t("templates")}</h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="ds-btn-primary">
          {t("new_template")}
        </button>
      </div>

      {showCreate && (
        <div className="ds-card p-6 mb-6">
          <h3 className="ds-section-title mb-4">{t("new_template_form")}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-caption-medium text-surface-500 mb-1">{t("template_name")}</label>
              <input type="text" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
                className="ds-input"
                placeholder={t("example_template")} />
            </div>
            <div>
              <label className="block text-caption-medium text-surface-500 mb-1">{t("category")}</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="ds-select">
                <option value="MARKETING">{t("marketing")}</option>
                <option value="UTILITY">{t("utility")}</option>
                <option value="AUTHENTICATION">{t("authentication")}</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-caption-medium text-surface-500 mb-1">{t("message_text")}</label>
            <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="ds-input h-24 resize-none"
              placeholder={t("msg_body_placeholder")} />
            <p className="text-micro text-surface-400 mt-1">{t("variables_hint")}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating}
              className="ds-btn-primary disabled:opacity-50">
              {creating ? t("sending") : t("send_to_meta")}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="ds-btn-secondary">{t("cancel")}</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-surface-500 text-caption">{t("loading")}</p> : templates.length === 0 ? (
        <div className="ds-empty-state">
          <p className="ds-empty-state-title">{t("no_templates")}</p>
          <p className="ds-empty-state-desc">{t("no_templates_desc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl, i) => (
            <div key={tpl.name + i} className="ds-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-body-medium font-medium">{tpl.name}</h3>
                <span className={`${statusColor(tpl.status)}`}>{t(`status_${tpl.status.toLowerCase()}`) || tpl.status}</span>
              </div>
              <div className="flex gap-2 text-caption text-surface-400">
                <span>{categoryLabel(tpl.category)}</span>
                <span>{tpl.language}</span>
              </div>
              {tpl.components && tpl.components.length > 0 && (
                <p className="text-caption text-surface-500 mt-2 line-clamp-2">
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
