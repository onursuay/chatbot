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
      <div className="ds-page-header px-7 py-5 border-b border-surface-300">
        <h2 className="ds-page-title">{t("leads")}</h2>
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
            {t("create_lead")}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-7 py-3 border-b border-surface-300 flex gap-3 flex-wrap">
        <select
          value={filterPipeline}
          onChange={(e) => { setFilterPipeline(e.target.value); setFilterStage("") }}
          className="ds-select w-auto"
        >
          <option value="">{t("all_pipelines")}</option>
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="ds-select w-auto"
        >
          <option value="">{t("all_stages")}</option>
          {(selectedPipeline?.stages || []).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="ds-select w-auto"
        >
          <option value="">{t("all_statuses")}</option>
          <option value="open">{t("open")}</option>
          <option value="won">{t("won")}</option>
          <option value="lost">{t("lost")}</option>
        </select>
      </div>

      {/* Create Lead Modal */}
      {showForm && (
        <div className="ds-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ds-modal-title">{t("create_lead")}</h3>
            {formError && <p className="text-red-600 text-caption mb-3">{formError}</p>}
            <div className="space-y-3">
              <div className="ds-form-group">
                <label className="ds-form-label">{t("lead_title")}</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t("lead_title")}
                  className="ds-input w-full"
                />
              </div>
              <div className="ds-form-group">
                <label className="ds-form-label">{t("value")}</label>
                <input
                  type="number"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={t("value")}
                  className="ds-input w-full"
                />
              </div>
              <div className="ds-form-group">
                <label className="ds-form-label">{t("select_pipeline")}</label>
                <select
                  value={formPipeline}
                  onChange={(e) => { setFormPipeline(e.target.value); setFormStage("") }}
                  className="ds-select w-full"
                >
                  <option value="">{t("select_pipeline")}</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="ds-form-group">
                <label className="ds-form-label">{t("select_stage")}</label>
                <select
                  value={formStage}
                  onChange={(e) => setFormStage(e.target.value)}
                  className="ds-select w-full"
                >
                  <option value="">{t("select_stage")}</option>
                  {(formPipelineObj?.stages || []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="ds-modal-actions">
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

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="ds-table w-full">
          <thead>
            <tr className="ds-table-header">
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
                className="ds-table-row cursor-pointer"
              >
                <td className="p-4 text-ui text-ink font-medium">{lead.title}</td>
                <td className="p-4 text-ui text-primary">
                  {lead.value != null ? `₺${lead.value.toLocaleString("tr-TR")}` : "\u2014"}
                </td>
                <td className="p-4">
                  <span className="ds-badge-primary">
                    {lead.stage_name || "\u2014"}
                  </span>
                </td>
                <td className="p-4 text-ui text-ink-secondary">{lead.contact_name || "\u2014"}</td>
                <td className="p-4 text-ui text-ink-secondary">{lead.assigned_user_name || "\u2014"}</td>
                <td className="p-4 text-ui text-ink-secondary">{lead.score ?? "\u2014"}</td>
                <td className="p-4 text-caption text-ink-tertiary">
                  {new Date(lead.created_at).toLocaleDateString("tr-TR")}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink-tertiary text-ui">{t("no_leads")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
