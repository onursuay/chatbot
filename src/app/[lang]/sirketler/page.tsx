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
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{t("companies")}</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary/90 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
          >
            {t("create_company")}
          </button>
        </div>
      </div>

      {/* Create Company Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-gray-900 font-semibold text-lg mb-4">{t("create_company")}</h3>
            {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}
            <div className="space-y-3">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("company_name")}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={formDomain}
                onChange={(e) => setFormDomain(e.target.value)}
                placeholder={t("domain")}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={formIndustry}
                onChange={(e) => setFormIndustry(e.target.value)}
                placeholder={t("industry")}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <select
                value={formSize}
                onChange={(e) => setFormSize(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
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
              <th className="text-left p-4">{t("domain")}</th>
              <th className="text-left p-4">{t("industry")}</th>
              <th className="text-left p-4">{t("size")}</th>
              <th className="text-left p-4">{t("contacts")}</th>
              <th className="text-left p-4">{t("leads")}</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                <td className="p-4 text-[14px] text-gray-900 font-medium">{c.name}</td>
                <td className="p-4 text-[14px] text-primary">{c.domain || "—"}</td>
                <td className="p-4 text-[14px] text-gray-600">{c.industry || "—"}</td>
                <td className="p-4 text-[14px] text-gray-600">{c.size || "—"}</td>
                <td className="p-4 text-[14px] text-gray-600">{c.contacts_count}</td>
                <td className="p-4 text-[14px] text-gray-600">{c.leads_count}</td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 text-[14px]">{t("no_companies")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
