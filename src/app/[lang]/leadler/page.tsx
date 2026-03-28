"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface Lead {
  id: string
  title: string
  value: number | null
  stage_name: string | null
  pipeline_name: string | null
  contact_name: string | null
  assigned_user_name: string | null
  score: number | null
  status: string
  created_at: string
}

interface Pipeline {
  id: string
  name: string
  stages: { id: string; name: string }[]
}

export default function LeadlerPage() {
  const { getToken } = useAuth()
  const { t, lang } = useI18n()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [search, setSearch] = useState("")
  const [filterPipeline, setFilterPipeline] = useState("")
  const [filterStage, setFilterStage] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterAssigned, setFilterAssigned] = useState("")
  const [showForm, setShowForm] = useState(false)

  // Form fields
  const [formTitle, setFormTitle] = useState("")
  const [formValue, setFormValue] = useState("")
  const [formPipeline, setFormPipeline] = useState("")
  const [formStage, setFormStage] = useState("")
  const [formError, setFormError] = useState("")

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<Pipeline[]>("/pipelines", { token }).then(setPipelines).catch(() => {})
  }, [getToken])

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (filterPipeline) params.set("pipeline_id", filterPipeline)
    if (filterStage) params.set("stage_id", filterStage)
    if (filterStatus) params.set("status", filterStatus)
    if (filterAssigned) params.set("assigned_to", filterAssigned)
    const q = params.toString() ? `?${params.toString()}` : ""

    api<Lead[]>(`/leads${q}`, { token }).then(setLeads).catch(() => {})
  }, [getToken, search, filterPipeline, filterStage, filterStatus, filterAssigned])

  const selectedPipeline = pipelines.find((p) => p.id === filterPipeline)
  const formPipelineObj = pipelines.find((p) => p.id === formPipeline)

  const handleCreate = async () => {
    const token = getToken()
    if (!token) return
    setFormError("")

    try {
      await api("/leads", {
        token,
        method: "POST",
        body: JSON.stringify({
          title: formTitle,
          value: formValue ? parseFloat(formValue) : null,
          pipeline_id: formPipeline || undefined,
          stage_id: formStage || undefined,
        }),
      })
      setShowForm(false)
      setFormTitle("")
      setFormValue("")
      setFormPipeline("")
      setFormStage("")
      // Refresh
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (filterPipeline) params.set("pipeline_id", filterPipeline)
      const q = params.toString() ? `?${params.toString()}` : ""
      api<Lead[]>(`/leads${q}`, { token }).then(setLeads).catch(() => {})
    } catch (err: any) {
      setFormError(err.message || t("error"))
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{t("leads")}</h2>
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
            {t("create_lead")}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3 border-b border-gray-200 flex gap-3 flex-wrap">
        <select
          value={filterPipeline}
          onChange={(e) => { setFilterPipeline(e.target.value); setFilterStage("") }}
          className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
        >
          <option value="">{t("all_pipelines")}</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
        >
          <option value="">{t("all_stages")}</option>
          {(selectedPipeline?.stages || []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
        >
          <option value="">{t("all_statuses")}</option>
          <option value="open">{t("open")}</option>
          <option value="won">{t("won")}</option>
          <option value="lost">{t("lost")}</option>
        </select>
      </div>

      {/* Create Lead Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-gray-900 font-semibold text-lg mb-4">{t("create_lead")}</h3>
            {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}
            <div className="space-y-3">
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t("lead_title")}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <input
                type="number"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                placeholder={t("value")}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <select
                value={formPipeline}
                onChange={(e) => { setFormPipeline(e.target.value); setFormStage("") }}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
              >
                <option value="">{t("select_pipeline")}</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <select
                value={formStage}
                onChange={(e) => setFormStage(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
              >
                <option value="">{t("select_stage")}</option>
                {(formPipelineObj?.stages || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
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

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase">
              <th className="text-left p-4">{t("title")}</th>
              <th className="text-left p-4">{t("value")}</th>
              <th className="text-left p-4">{t("stage")}</th>
              <th className="text-left p-4">{t("contact")}</th>
              <th className="text-left p-4">{t("assigned")}</th>
              <th className="text-left p-4">{t("score")}</th>
              <th className="text-left p-4">{t("created_at")}</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                onClick={() => router.push(`/${lang}/leadler/${lead.id}`)}
                className="border-b border-gray-100 hover:bg-gray-50/50 transition cursor-pointer"
              >
                <td className="p-4 text-[14px] text-gray-900 font-medium">{lead.title}</td>
                <td className="p-4 text-[14px] text-primary">
                  {lead.value != null ? `$${lead.value.toLocaleString()}` : "—"}
                </td>
                <td className="p-4">
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded">
                    {lead.stage_name || "—"}
                  </span>
                </td>
                <td className="p-4 text-[14px] text-gray-600">{lead.contact_name || "—"}</td>
                <td className="p-4 text-[14px] text-gray-600">{lead.assigned_user_name || "—"}</td>
                <td className="p-4 text-[14px] text-gray-600">{lead.score ?? "—"}</td>
                <td className="p-4 text-xs text-gray-400">
                  {new Date(lead.created_at).toLocaleDateString("tr-TR")}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 text-[14px]">{t("no_leads")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
