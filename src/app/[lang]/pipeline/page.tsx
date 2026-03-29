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
  position: number
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
  const router = useRouter()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("")
  const [leads, setLeads] = useState<Lead[]>([])
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<Pipeline[]>("/pipelines", { token })
      .then((data) => {
        setPipelines(data)
        if (data.length > 0) setSelectedPipelineId(data[0].id)
      })
      .catch(() => {})
  }, [getToken])

  useEffect(() => {
    const token = getToken()
    if (!token || !selectedPipelineId) return
    api<Lead[]>(`/leads?pipeline_id=${selectedPipelineId}`, { token })
      .then(setLeads)
      .catch(() => {})
  }, [getToken, selectedPipelineId])

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId)
  const stages = selectedPipeline?.stages?.sort((a, b) => a.position - b.position) || []

  const getLeadsForStage = (stageId: string) => leads.filter((l) => l.stage_id === stageId)

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("pipeline")}</h2>
          <p className="ds-page-subtitle">CRM deal management</p>
        </div>
        <div className="flex gap-2.5">
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="ds-select"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-6">
        {stages.length === 0 ? (
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
                  className="w-72 flex flex-col bg-surface-200 rounded-card border border-surface-300"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => setDraggedLeadId(null)}
                >
                  {/* Stage Header */}
                  <div className="px-4 py-3 border-b border-surface-300 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {stage.color && (
                        <div className="w-2.5 h-2.5 rounded-full ring-2 ring-surface-200" style={{ backgroundColor: stage.color }} />
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
                          <p className="text-caption-medium text-primary mt-1">${lead.value.toLocaleString()}</p>
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
