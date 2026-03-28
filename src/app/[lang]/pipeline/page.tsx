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
    <div className="h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{t("pipeline")}</h2>
        <div className="flex gap-3">
          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
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
            <p className="text-gray-400 text-[14px]">{t("no_stages")}</p>
          </div>
        ) : (
          <div className="flex gap-4 h-full min-w-max">
            {stages.map((stage) => {
              const stageLeads = getLeadsForStage(stage.id)
              return (
                <div
                  key={stage.id}
                  className="w-72 flex flex-col bg-white rounded-lg border border-gray-200"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => setDraggedLeadId(null)}
                >
                  <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stage.color && (
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                      )}
                      <span className="text-gray-900 text-sm font-medium">{stage.name}</span>
                    </div>
                    <span className="text-gray-400 text-xs">{stageLeads.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggedLeadId(lead.id)}
                        onDragEnd={() => setDraggedLeadId(null)}
                        onClick={() => router.push(`/${lang}/leadler/${lead.id}`)}
                        className={`bg-gray-100 rounded-lg p-3 cursor-pointer border border-gray-300 hover:border-primary/30 hover:bg-gray-100 transition ${
                          draggedLeadId === lead.id ? "opacity-50" : ""
                        }`}
                      >
                        <p className="text-gray-900 text-sm font-medium">{lead.title}</p>
                        {lead.value != null && (
                          <p className="text-primary text-xs mt-1 font-medium">${lead.value.toLocaleString()}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {lead.contact_name && (
                            <span className="text-gray-500 text-xs">{lead.contact_name}</span>
                          )}
                          {lead.assigned_user_name && (
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold" title={lead.assigned_user_name}>
                              {lead.assigned_user_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <p className="text-gray-400 text-xs text-center py-4">{t("no_leads")}</p>
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
