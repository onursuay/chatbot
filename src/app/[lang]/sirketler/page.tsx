"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface Company {
  id: string
  name: string
  domain: string | null
  industry: string | null
  size: string | null
  contacts_count: number
  leads_count: number
}

export default function SirketlerPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [companies, setCompanies] = useState<Company[]>([])
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)

  // Form fields
  const [formName, setFormName] = useState("")
  const [formDomain, setFormDomain] = useState("")
  const [formIndustry, setFormIndustry] = useState("")
  const [formSize, setFormSize] = useState("")
  const [formError, setFormError] = useState("")

  useEffect(() => {
    const token = getToken()
    if (!token) return
    const q = search ? `?search=${search}` : ""
    api<Company[]>(`/companies${q}`, { token }).then(setCompanies).catch(() => {})
  }, [getToken, search])

  const handleCreate = async () => {
    const token = getToken()
    if (!token) return
    setFormError("")

    try {
      await api("/companies", {
        token,
        method: "POST",
        body: JSON.stringify({
          name: formName,
          domain: formDomain || undefined,
          industry: formIndustry || undefined,
          size: formSize || undefined,
        }),
      })
      setShowForm(false)
      setFormName("")
      setFormDomain("")
      setFormIndustry("")
      setFormSize("")
      const q = search ? `?search=${search}` : ""
      api<Company[]>(`/companies${q}`, { token }).then(setCompanies).catch(() => {})
    } catch (err: any) {
      setFormError(err.message || t("error"))
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="ds-page-header px-7 py-5 border-b border-surface-200">
        <h2 className="ds-page-title">{t("companies")}</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="ds-input"
          />
          <button
            onClick={() => setShowForm(true)}
            className="ds-btn-primary"
          >
            {t("create_company")}
          </button>
        </div>
      </div>

      {/* Create Company Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="ds-card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="ds-section-title text-lg mb-4">{t("create_company")}</h3>
            {formError && <p className="text-red-400 text-caption mb-3">{formError}</p>}
            <div className="space-y-3">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("company_name")}
                className="ds-input"
              />
              <input
                type="text"
                value={formDomain}
                onChange={(e) => setFormDomain(e.target.value)}
                placeholder={t("domain")}
                className="ds-input"
              />
              <input
                type="text"
                value={formIndustry}
                onChange={(e) => setFormIndustry(e.target.value)}
                placeholder={t("industry")}
                className="ds-input"
              />
              <select
                value={formSize}
                onChange={(e) => setFormSize(e.target.value)}
                className="ds-input"
              >
                <option value="">{t("select_size")}</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="501+">501+</option>
              </select>
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
              <th className="text-left p-4">{t("domain")}</th>
              <th className="text-left p-4">{t("industry")}</th>
              <th className="text-left p-4">{t("size")}</th>
              <th className="text-left p-4">{t("contacts")}</th>
              <th className="text-left p-4">{t("leads")}</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="ds-table-row">
                <td className="p-4 text-ui text-ink font-medium">{c.name}</td>
                <td className="p-4 text-ui text-primary">{c.domain || "\u2014"}</td>
                <td className="p-4 text-ui text-surface-500">{c.industry || "\u2014"}</td>
                <td className="p-4 text-ui text-surface-500">{c.size || "\u2014"}</td>
                <td className="p-4 text-ui text-surface-500">{c.contacts_count}</td>
                <td className="p-4 text-ui text-surface-500">{c.leads_count}</td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-surface-400 text-ui">{t("no_companies")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
