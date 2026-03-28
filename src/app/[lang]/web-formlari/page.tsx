"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface WebForm {
  id: string
  name: string
  slug: string
  submissions_count: number
  is_active: boolean
  created_at: string
}

export default function WebFormlariPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [forms, setForms] = useState<WebForm[]>([])
  const [showForm, setShowForm] = useState(false)

  // Form fields
  const [formName, setFormName] = useState("")
  const [formSlug, setFormSlug] = useState("")
  const [formError, setFormError] = useState("")

  const fetchForms = () => {
    const token = getToken()
    if (!token) return
    api<WebForm[]>("/crm/web-forms", { token }).then(setForms).catch(() => {})
  }

  useEffect(() => {
    fetchForms()
  }, [getToken])

  const handleCreate = async () => {
    const token = getToken()
    if (!token) return
    setFormError("")

    try {
      await api("/crm/web-forms", {
        token,
        method: "POST",
        body: JSON.stringify({
          name: formName,
          slug: formSlug || undefined,
        }),
      })
      setShowForm(false)
      setFormName("")
      setFormSlug("")
      fetchForms()
    } catch (err: any) {
      setFormError(err.message || t("error"))
    }
  }

  const handleToggleActive = async (formId: string, currentActive: boolean) => {
    const token = getToken()
    if (!token) return

    try {
      await api(`/crm/web-forms/${formId}`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ is_active: !currentActive }),
      })
      fetchForms()
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="ds-page-header px-7 py-5 border-b border-surface-200">
        <h2 className="ds-page-title">{t("web_forms")}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="ds-btn-primary"
        >
          {t("create_form")}
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="ds-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="ds-section-title text-lg mb-4">{t("create_form")}</h3>
            {formError && <p className="text-red-400 text-caption mb-3">{formError}</p>}
            <div className="space-y-3">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("form_name")}
                className="ds-input"
              />
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder={t("slug")}
                className="ds-input"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowForm(false)}
                className="ds-btn-ghost"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                className="ds-btn-primary"
              >
                {t("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <table className="ds-table w-full">
          <thead>
            <tr className="ds-table-header">
              <th className="text-left p-4">{t("name")}</th>
              <th className="text-left p-4">{t("slug")}</th>
              <th className="text-left p-4">{t("submissions")}</th>
              <th className="text-left p-4">{t("status")}</th>
              <th className="text-left p-4">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((f) => (
              <tr key={f.id} className="ds-table-row">
                <td className="p-4 text-ui text-ink font-medium">{f.name}</td>
                <td className="p-4 text-ui text-surface-500 font-mono">{f.slug}</td>
                <td className="p-4 text-ui text-surface-500">{f.submissions_count}</td>
                <td className="p-4">
                  <span className={`${
                    f.is_active ? "ds-badge-success" : "ds-badge-neutral"
                  }`}>
                    {f.is_active ? t("active") : t("inactive")}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleToggleActive(f.id, f.is_active)}
                    className="text-primary hover:text-primary text-caption-medium font-medium transition"
                  >
                    {f.is_active ? t("deactivate") : t("activate")}
                  </button>
                </td>
              </tr>
            ))}
            {forms.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-surface-400 text-ui">{t("no_forms")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
