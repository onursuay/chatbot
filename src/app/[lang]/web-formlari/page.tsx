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
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{t("web_forms")}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary hover:bg-primary/90 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          {t("create_form")}
        </button>
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-gray-900 font-semibold text-lg mb-4">{t("create_form")}</h3>
            {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}
            <div className="space-y-3">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("form_name")}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                placeholder={t("slug")}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-900 text-sm px-4 py-2.5 transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                className="bg-primary hover:bg-primary/90 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
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
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase">
              <th className="text-left p-4">{t("name")}</th>
              <th className="text-left p-4">{t("slug")}</th>
              <th className="text-left p-4">{t("submissions")}</th>
              <th className="text-left p-4">{t("status")}</th>
              <th className="text-left p-4">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((f) => (
              <tr key={f.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                <td className="p-4 text-[14px] text-gray-900 font-medium">{f.name}</td>
                <td className="p-4 text-[14px] text-gray-600 font-mono">{f.slug}</td>
                <td className="p-4 text-[14px] text-gray-600">{f.submissions_count}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    f.is_active ? "bg-green-500/10 text-green-400" : "bg-gray-200 text-gray-500"
                  }`}>
                    {f.is_active ? t("active") : t("inactive")}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleToggleActive(f.id, f.is_active)}
                    className="text-primary hover:text-primary text-xs font-medium transition"
                  >
                    {f.is_active ? t("deactivate") : t("activate")}
                  </button>
                </td>
              </tr>
            ))}
            {forms.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400 text-[14px]">{t("no_forms")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
