"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n, localePath, type Lang } from "@/lib/i18n"

interface Pipeline {
  id: string
  name: string
  stages: Stage[]
}

interface Stage {
  id: string
  name: string
  position?: number
  sort_order?: number
  color: string | null
}

interface Lead {
  id: string
  title: string
  value: number | null
  stage_id: string
  contact_name: string | null
  assigned_user_name: string | null
  assigned_user_avatar: string | null
}

export default function PipelinePage() {
  const { getToken } = useAuth()
  const { t, lang } = useI18n()
  const isTR = lang === "tr"
  const router = useRouter()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("")
  const [leads, setLeads] = useState<Lead[]>([])
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadPipelines = async () => {
    const token = getToken()
    if (!token) return
    try {
      const data = await api<Pipeline[]>("/pipelines", { token })
      console.log("Pipeline data:", JSON.stringify(data, null, 2))
      setPipelines(data)
      if (data.length > 0 && !selectedPipelineId) setSelectedPipelineId(data[0].id)
      else if (data.length > 0 && !data.find(p => p.id === selectedPipelineId)) setSelectedPipelineId(data[0].id)
    } catch (err: any) {
      console.error("Pipeline yükleme hatası:", err)
    }
    setLoading(false)
  }

  const createDefaultPipeline = async () => {
    const token = getToken()
    if (!token) return
    setCreating(true)
    try {
      const created = await api<any>("/pipelines", {
        method: "POST",
        token,
        body: JSON.stringify({
          name: isTR ? "Satış Pipeline" : "Sales Pipeline",
          stages: [
            { name: isTR ? "Yeni" : "New", sort_order: 0, color: "#3B82F6" },
            { name: isTR ? "İletişimde" : "Contacted", sort_order: 1, color: "#F59E0B" },
            { name: isTR ? "Teklif Verildi" : "Proposal", sort_order: 2, color: "#8B5CF6" },
            { name: isTR ? "Müzakere" : "Negotiation", sort_order: 3, color: "#EC4899" },
            { name: isTR ? "Kazanıldı" : "Won", sort_order: 4, color: "#10B981", is_win: true },
            { name: isTR ? "Kaybedildi" : "Lost", sort_order: 5, color: "#EF4444", is_loss: true },
          ],
        }),
      })
      console.log("Pipeline created:", JSON.stringify(created, null, 2))
      if (created?.id) setSelectedPipelineId(created.id)
      await loadPipelines()
    } catch (err: any) {
      console.error("Pipeline oluşturma hatası:", err)
      alert((isTR ? "Pipeline oluşturulamadı: " : "Pipeline creation failed: ") + (err.message || "Bilinmeyen hata"))
    }
    setCreating(false)
  }

  useEffect(() => {
    loadPipelines()
  }, [getToken])

  useEffect(() => {
    const token = getToken()
    if (!token || !selectedPipelineId) return
    api<Lead[]>(`/leads?pipeline_id=${selectedPipelineId}`, { token })
      .then(setLeads)
      .catch(() => {})
  }, [getToken, selectedPipelineId])

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId)
  const stages = selectedPipeline?.stages?.sort((a, b) => (a.sort_order ?? a.position ?? 0) - (b.sort_order ?? b.position ?? 0)) || []

  const getLeadsForStage = (stageId: string) => leads.filter((l) => l.stage_id === stageId)

  const handleDrop = async (targetStageId: string) => {
    if (!draggedLeadId) return
    const lead = leads.find((l) => l.id === draggedLeadId)
    if (!lead || lead.stage_id === targetStageId) {
      setDraggedLeadId(null)
      return
    }

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === draggedLeadId ? { ...l, stage_id: targetStageId } : l))
    )
    setDraggedLeadId(null)

    // Persist to backend
    const token = getToken()
    if (!token) return
    try {
      await api("/leads", {
        token,
        method: "PATCH",
        body: JSON.stringify({ id: draggedLeadId, stage_id: targetStageId }),
      })
    } catch {
      // Revert on failure
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, stage_id: lead.stage_id } : l))
      )
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("pipeline")}</h2>
          <p className="ds-page-subtitle">CRM deal management</p>
        </div>
        <div className="flex gap-2.5">
          {pipelines.length > 0 && (
            <select
              value={selectedPipelineId}
              onChange={(e) => setSelectedPipelineId(e.target.value)}
              className="ds-select min-w-[200px]"
            >
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button onClick={createDefaultPipeline} disabled={creating} className="ds-btn-primary">
            {creating
              ? (isTR ? "Oluşturuluyor..." : "Creating...")
              : (isTR ? "+ Pipeline Oluştur" : "+ Create Pipeline")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-ink-tertiary">{t("loading")}</p>
          </div>
        ) : pipelines.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="ds-empty-state text-center">
              <div className="ds-empty-state-icon mx-auto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-ink-tertiary">
                  <path d="M3 3h5v18H3zM10 3h5v18h-5zM17 3h5v18h-5z" />
                </svg>
              </div>
              <p className="ds-empty-state-title">{isTR ? "Henüz pipeline yok" : "No pipelines yet"}</p>
              <p className="text-caption text-ink-tertiary mt-1 mb-4">{isTR ? "Satış sürecinizi yönetmek için bir pipeline oluşturun" : "Create a pipeline to manage your sales process"}</p>
              <button onClick={createDefaultPipeline} disabled={creating} className="ds-btn-primary">
                {creating
                  ? (isTR ? "Oluşturuluyor..." : "Creating...")
                  : (isTR ? "+ Pipeline Oluştur" : "+ Create Pipeline")}
              </button>
            </div>
          </div>
        ) : stages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="ds-empty-state">
              <div className="ds-empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-ink-tertiary">
                  <path d="M3 3h5v18H3zM10 3h5v18h-5zM17 3h5v18h-5z" />
                </svg>
              </div>
              <p className="ds-empty-state-title">{t("no_stages")}</p>
            </div>
          </div>
        ) : (
          <div className="flex gap-4 h-full min-w-max">
            {stages.map((stage) => {
              const stageLeads = getLeadsForStage(stage.id)
              return (
                <div
                  key={stage.id}
                  className="w-72 flex flex-col bg-white rounded-card border border-surface-300 shadow-card"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(stage.id)}
                >
                  {/* Stage Header */}
                  <div className="px-4 py-3 border-b border-surface-300 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {stage.color && (
                        <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: stage.color }} />
                      )}
                      <span className="text-body-medium text-ink">{stage.name}</span>
                    </div>
                    <span className="ds-badge-neutral">{stageLeads.length}</span>
                  </div>

                  {/* Stage Cards */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggedLeadId(lead.id)}
                        onDragEnd={() => setDraggedLeadId(null)}
                        onClick={() => router.push(`/${lang}/leadler/${lead.id}`)}
                        className={`ds-card-interactive p-3.5 ${
                          draggedLeadId === lead.id ? "opacity-50" : ""
                        }`}
                      >
                        <p className="text-body-medium text-ink">{lead.title}</p>
                        {lead.value != null && (
                          <p className="text-caption-medium text-primary mt-1">₺{lead.value.toLocaleString("tr-TR")}</p>
                        )}
                        <div className="flex items-center justify-between mt-2.5">
                          {lead.contact_name && (
                            <span className="text-caption text-ink-secondary">{lead.contact_name}</span>
                          )}
                          {lead.assigned_user_name && (
                            <div className="w-6 h-6 rounded-avatar bg-primary flex items-center justify-center text-white text-[10px] font-bold" title={lead.assigned_user_name}>
                              {lead.assigned_user_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <p className="text-caption text-ink-tertiary text-center py-6">{t("no_leads")}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
