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
      <div className="p-6 border-b border-dark-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">{t("web_forms")}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-brand-500 hover:bg-brand-600 text-dark-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          {t("create_form")}
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-dark-900 rounded-lg border border-dark-800 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-4">{t("create_form")}</h3>
            {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}
            <div className="space-y-3">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("form_name")}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
              />
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder={t("slug")}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowForm(false)}
                className="text-dark-400 hover:text-white text-sm px-4 py-2.5 transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                className="bg-brand-500 hover:bg-brand-600 text-dark-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
              >
                {t("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-800 text-dark-400 text-xs uppercase">
              <th className="text-left p-4">{t("name")}</th>
              <th className="text-left p-4">{t("slug")}</th>
              <th className="text-left p-4">{t("submissions")}</th>
              <th className="text-left p-4">{t("status")}</th>
              <th className="text-left p-4">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((f) => (
              <tr key={f.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition">
                <td className="p-4 text-[14px] text-white font-medium">{f.name}</td>
                <td className="p-4 text-[14px] text-dark-300 font-mono">{f.slug}</td>
                <td className="p-4 text-[14px] text-dark-300">{f.submissions_count}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    f.is_active ? "bg-green-500/10 text-green-400" : "bg-dark-700 text-dark-400"
                  }`}>
                    {f.is_active ? t("active") : t("inactive")}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleToggleActive(f.id, f.is_active)}
                    className="text-brand-400 hover:text-brand-300 text-xs font-medium transition"
                  >
                    {f.is_active ? t("deactivate") : t("activate")}
                  </button>
                </td>
              </tr>
            ))}
            {forms.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-dark-600 text-[14px]">{t("no_forms")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
