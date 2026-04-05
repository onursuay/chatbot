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
  const [deletingName, setDeletingName] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", text: "", category: "UTILITY", language: "en" })

  const fetchTemplates = async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const data = await api<Template[]>("/templates", { token })
      setTemplates(data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchTemplates()
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
      await fetchTemplates()
      setShowCreate(false)
      setForm({ name: "", text: "", category: "UTILITY", language: "en" })
    } catch (err: any) {
      alert(err.message || t("failed"))
    }
    setCreating(false)
  }

  const handleDelete = async (templateName: string) => {
    if (!confirm(t("delete_template_confirm"))) return
    const token = getToken()
    if (!token) return
    setDeletingName(templateName)
    try {
      await api("/templates", {
        method: "DELETE", token,
        body: JSON.stringify({ templateName }),
      })
      setTemplates(prev => prev.filter(tpl => tpl.name !== templateName))
    } catch (err: any) {
      alert(err.message || t("failed"))
    }
    setDeletingName(null)
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
        <button onClick={() => setShowCreate(!showCreate)} className="ds-btn-primary">
          {t("new_template")}
        </button>
      </div>

      {showCreate && (
        <div className="ds-card p-6 mb-6">
          <h3 className="ds-section-title mb-4">{t("new_template_form")}</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-caption-medium text-ink-secondary mb-1">{t("template_name")}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") })}
                className="ds-input w-full"
                placeholder={t("example_template")}
              />
            </div>
            <div>
              <label className="block text-caption-medium text-ink-secondary mb-1">{t("category")}</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="ds-select w-full"
              >
                <option value="UTILITY">{t("utility")}</option>
                <option value="MARKETING">{t("marketing")}</option>
                <option value="AUTHENTICATION">{t("authentication")}</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-caption-medium text-ink-secondary mb-1">{t("message_text")}</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="ds-input w-full h-32 resize-none"
              placeholder={t("msg_body_placeholder")}
            />
            <p className="text-micro text-ink-tertiary mt-1">{t("variables_hint")}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="ds-btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {creating && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {creating ? t("sending") : t("send_to_meta")}
            </button>
            <button onClick={() => setShowCreate(false)} className="ds-btn-secondary">{t("cancel")}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="ds-card p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 bg-gray-200 rounded w-2/3" />
                <div className="h-5 bg-gray-200 rounded w-16" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="ds-empty-state">
          <p className="ds-empty-state-title">{t("no_templates")}</p>
          <p className="ds-empty-state-desc">{t("no_templates_desc")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl, i) => (
            <div key={tpl.name + i} className="ds-card p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-body-medium font-medium break-all">{tpl.name}</h3>
                <span className={`${statusColor(tpl.status)} shrink-0 ml-2`}>{t(`status_${tpl.status.toLowerCase()}`) || tpl.status}</span>
              </div>
              <div className="flex gap-2 text-caption text-ink-tertiary">
                <span>{categoryLabel(tpl.category)}</span>
                <span>{tpl.language}</span>
              </div>
              {tpl.components && tpl.components.length > 0 && (
                <p className="text-caption text-ink-secondary line-clamp-3">
                  {tpl.components.find((c: any) => c.type === "BODY")?.text || ""}
                </p>
              )}
              <div className="mt-auto pt-2 border-t border-surface-border">
                <button
                  onClick={() => handleDelete(tpl.name)}
                  disabled={deletingName === tpl.name}
                  className="text-caption text-red-500 hover:text-red-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {deletingName === tpl.name ? (
                    <>
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      {t("deleting")}
                    </>
                  ) : t("delete_template")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
