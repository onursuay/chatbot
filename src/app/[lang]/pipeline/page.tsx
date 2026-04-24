"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface Pipeline {
  id: string
  name: string
  stages: Stage[]
}

interface Stage {
  id: string
  name: string
  position: number
  sort_order?: number
  color: string | null
}

type Channel = "all" | "whatsapp" | "instagram" | "facebook" | "telegram" | "whatsapp_personal"

interface Lead {
  id: string
  title: string
  value: number | null
  stage_id: string
  contact_name: string | null
  assigned_user_name: string | null
  attributes?: { channel?: string }
}

const CHANNEL_CONFIG: Record<string, { label: string; color: string; icon: JSX.Element }> = {
  whatsapp: {
    label: "WhatsApp",
    color: "#25D366",
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
  },
  instagram: {
    label: "Instagram",
    color: "#E1306C",
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none"/></svg>,
  },
  facebook: {
    label: "Messenger",
    color: "#0084FF",
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.17 7.18V22l2.93-1.63c.83.23 1.71.36 2.63.36h.27c5.64 0 10-4.13 10-9.7C21 6.13 17.64 2 12 2zm.97 13.04l-2.55-2.73L5.4 15.3l5.04-5.36 2.62 2.73 4.94-2.98-5.03 5.35z"/></svg>,
  },
  telegram: {
    label: "Telegram",
    color: "#229ED9",
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
  },
  whatsapp_personal: {
    label: "WA Kişisel",
    color: "#128C7E",
    icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>,
  },
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
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Pipeline | null>(null)
  const [channelFilter, setChannelFilter] = useState<Channel>("all")

  // Inline lead creation
  const [addingToStage, setAddingToStage] = useState<string | null>(null)
  const [newLeadTitle, setNewLeadTitle] = useState("")
  const [newLeadValue, setNewLeadValue] = useState("")
  const [savingLead, setSavingLead] = useState(false)
  const newLeadInputRef = useRef<HTMLInputElement>(null)

  // Run once on mount
  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<Pipeline[]>("/pipelines", { token })
      .then((data) => {
        setPipelines(data)
        if (data.length > 0) setSelectedPipelineId(data[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load leads when pipeline changes
  useEffect(() => {
    if (!selectedPipelineId) return
    const token = getToken()
    if (!token) return
    api<Lead[]>(`/leads?pipeline_id=${selectedPipelineId}`, { token })
      .then(setLeads)
      .catch(() => {})
  }, [selectedPipelineId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus input when add form opens
  useEffect(() => {
    if (addingToStage) {
      setTimeout(() => newLeadInputRef.current?.focus(), 50)
    }
  }, [addingToStage])

  const reloadPipelines = async () => {
    const token = getToken()
    if (!token) return
    const data = await api<Pipeline[]>("/pipelines", { token })
    setPipelines(data)
    return data
  }

  const createDefaultPipeline = async () => {
    const token = getToken()
    if (!token) return
    setCreating(true)
    try {
      await api("/pipelines", {
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
      const data = await reloadPipelines()
      if (data && data.length > 0) setSelectedPipelineId(data[data.length - 1].id)
    } catch (err: any) {
      alert((isTR ? "Pipeline oluşturulamadı: " : "Failed: ") + (err.message || ""))
    }
    setCreating(false)
  }

  const deletePipeline = async (pipeline: Pipeline) => {
    const token = getToken()
    if (!token) return
    setDeletingId(pipeline.id)
    try {
      await api(`/pipelines/${pipeline.id}`, { method: "DELETE", token })
      const remaining = pipelines.filter((p) => p.id !== pipeline.id)
      setPipelines(remaining)
      if (selectedPipelineId === pipeline.id) {
        setSelectedPipelineId(remaining[0]?.id || "")
        setLeads([])
      }
    } catch (err: any) {
      alert((isTR ? "Silinemedi: " : "Failed: ") + (err.message || ""))
    }
    setDeletingId(null)
    setDeleteTarget(null)
  }

  const handleDrop = async (targetStageId: string) => {
    setDragOverStageId(null)
    if (!draggedLeadId) return
    const lead = leads.find((l) => l.id === draggedLeadId)
    if (!lead || lead.stage_id === targetStageId) { setDraggedLeadId(null); return }

    setLeads((prev) => prev.map((l) => l.id === draggedLeadId ? { ...l, stage_id: targetStageId } : l))
    setDraggedLeadId(null)

    const token = getToken()
    if (!token) return
    try {
      await api("/leads", { token, method: "PATCH", body: JSON.stringify({ id: lead.id, stage_id: targetStageId }) })
    } catch {
      setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, stage_id: lead.stage_id } : l))
    }
  }

  const handleAddLead = async (stageId: string) => {
    if (!newLeadTitle.trim() || !selectedPipelineId || savingLead) return
    const token = getToken()
    if (!token) return
    setSavingLead(true)
    try {
      const lead = await api<Lead>("/leads", {
        method: "POST",
        token,
        body: JSON.stringify({
          title: newLeadTitle.trim(),
          pipeline_id: selectedPipelineId,
          stage_id: stageId,
          value: newLeadValue ? parseFloat(newLeadValue) : 0,
        }),
      })
      setLeads((prev) => [...prev, lead])
      setNewLeadTitle("")
      setNewLeadValue("")
      setAddingToStage(null)
    } catch (err: any) {
      alert((isTR ? "Lead eklenemedi: " : "Failed: ") + (err.message || ""))
    }
    setSavingLead(false)
  }

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId)
  const stages = (selectedPipeline?.stages || []).sort((a, b) => (a.sort_order ?? a.position ?? 0) - (b.sort_order ?? b.position ?? 0))

  const filteredLeads = channelFilter === "all"
    ? leads
    : leads.filter((l) => (l.attributes?.channel || "whatsapp") === channelFilter)

  const totalValue = filteredLeads.reduce((sum, l) => sum + (l.value || 0), 0)

  // Hangi kanalların lead'i var?
  const channelsInUse = Array.from(new Set(leads.map((l) => l.attributes?.channel || "whatsapp"))) as Channel[]

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{isTR ? "Satış Pipeline" : "Sales Pipeline"}</h2>
          <p className="ds-page-subtitle">
            {filteredLeads.length} {isTR ? "lead" : "leads"}
            {totalValue > 0 && ` · ₺${totalValue.toLocaleString("tr-TR")}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pipelines.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedPipelineId}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
                className="ds-select min-w-[180px]"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {/* Delete selected pipeline */}
              <button
                onClick={() => setDeleteTarget(selectedPipeline || null)}
                disabled={!selectedPipeline}
                title={isTR ? "Bu pipeline'ı sil" : "Delete pipeline"}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] text-ink-tertiary hover:text-red-500 hover:bg-red-50 transition-colors border border-surface-300 disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          )}
          {pipelines.length > 0 && (
            <button onClick={createDefaultPipeline} disabled={creating} className="ds-btn-primary ds-btn-sm">
              {creating ? (isTR ? "Oluşturuluyor..." : "Creating...") : (isTR ? "+ Pipeline Oluştur" : "+ New Pipeline")}
            </button>
          )}
        </div>
      </div>

      {/* Kanal filtresi */}
      {pipelines.length > 0 && channelsInUse.length > 0 && (
        <div className="px-6 pt-4 flex items-center gap-2 flex-wrap border-b border-surface-300 pb-3">
          <button
            onClick={() => setChannelFilter("all")}
            className={`px-3 py-1.5 rounded-btn text-caption font-medium transition-colors flex items-center gap-1.5 ${channelFilter === "all" ? "bg-ink text-white" : "bg-surface-150 text-ink-secondary hover:bg-surface-200"}`}
          >
            {isTR ? "Tümü" : "All"}
            <span className="text-[10px] opacity-70">{leads.length}</span>
          </button>
          {channelsInUse.map((ch) => {
            const cfg = CHANNEL_CONFIG[ch]
            if (!cfg) return null
            const count = leads.filter((l) => (l.attributes?.channel || "whatsapp") === ch).length
            return (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={`px-3 py-1.5 rounded-btn text-caption font-medium transition-colors flex items-center gap-1.5 ${channelFilter === ch ? "text-white" : "bg-surface-150 text-ink-secondary hover:bg-surface-200"}`}
                style={channelFilter === ch ? { backgroundColor: cfg.color } : {}}
              >
                <span style={{ color: channelFilter === ch ? "white" : cfg.color }}>{cfg.icon}</span>
                {cfg.label}
                <span className="text-[10px] opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-ink-tertiary">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <span className="text-caption">{t("loading")}</span>
            </div>
          </div>
        ) : pipelines.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="ds-empty-state-icon mx-auto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-ink-tertiary">
                  <path d="M3 3h5v18H3zM10 3h5v18h-5zM17 3h5v18h-5z" />
                </svg>
              </div>
              <p className="ds-empty-state-title">{isTR ? "Henüz pipeline yok" : "No pipelines yet"}</p>
              <p className="text-caption text-ink-tertiary mt-1 mb-4">{isTR ? "Satış sürecinizi yönetmek için bir pipeline oluşturun" : "Create a pipeline to manage your sales process"}</p>
              <button onClick={createDefaultPipeline} disabled={creating} className="ds-btn-primary">
                {creating ? (isTR ? "Oluşturuluyor..." : "Creating...") : (isTR ? "+ Pipeline Oluştur" : "+ Create Pipeline")}
              </button>
            </div>
          </div>
        ) : stages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-caption text-ink-tertiary">{isTR ? "Bu pipeline'da aşama yok" : "No stages in this pipeline"}</p>
          </div>
        ) : (
          <div className="flex gap-4 h-full min-w-max pb-4">
            {stages.map((stage) => {
              const stageLeads = filteredLeads.filter((l) => l.stage_id === stage.id)
              const isOver = dragOverStageId === stage.id
              const isAdding = addingToStage === stage.id
              return (
                <div
                  key={stage.id}
                  className={`w-72 flex flex-col rounded-card border shadow-card transition-colors ${isOver ? "border-primary/40 bg-primary/5" : "border-surface-300 bg-white"}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverStageId(stage.id) }}
                  onDragLeave={() => setDragOverStageId(null)}
                  onDrop={() => handleDrop(stage.id)}
                >
                  {/* Stage Header */}
                  <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {stage.color && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />}
                      <span className="text-body-medium font-semibold text-ink">{stage.name}</span>
                      <span className="ds-badge-neutral text-[10px]">{stageLeads.length}</span>
                    </div>
                    <button
                      onClick={() => { setAddingToStage(isAdding ? null : stage.id); setNewLeadTitle(""); setNewLeadValue("") }}
                      className="w-6 h-6 flex items-center justify-center rounded text-ink-tertiary hover:text-primary hover:bg-primary/10 transition-colors"
                      title={isTR ? "Lead ekle" : "Add lead"}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                    {/* Inline add form */}
                    {isAdding && (
                      <div className="bg-surface-50 border border-primary/20 rounded-card-sm p-2.5 space-y-1.5">
                        <input
                          ref={newLeadInputRef}
                          type="text"
                          value={newLeadTitle}
                          onChange={(e) => setNewLeadTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddLead(stage.id)
                            if (e.key === "Escape") { setAddingToStage(null); setNewLeadTitle("") }
                          }}
                          placeholder={isTR ? "Lead başlığı..." : "Lead title..."}
                          className="w-full text-ui bg-white border border-surface-300 rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-primary/50 text-sm"
                        />
                        <input
                          type="number"
                          value={newLeadValue}
                          onChange={(e) => setNewLeadValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddLead(stage.id) }}
                          placeholder={isTR ? "Değer (₺)" : "Value (₺)"}
                          className="w-full text-ui bg-white border border-surface-300 rounded-[6px] px-2.5 py-1.5 focus:outline-none focus:border-primary/50 text-sm"
                        />
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleAddLead(stage.id)}
                            disabled={!newLeadTitle.trim() || savingLead}
                            className="flex-1 py-1 text-[12px] font-semibold bg-primary text-white rounded-[6px] hover:bg-primary-hover disabled:opacity-40 transition-colors"
                          >
                            {savingLead ? "..." : (isTR ? "Ekle" : "Add")}
                          </button>
                          <button
                            onClick={() => { setAddingToStage(null); setNewLeadTitle("") }}
                            className="px-2 py-1 text-[12px] text-ink-secondary bg-surface-150 rounded-[6px] hover:bg-surface-200 transition-colors"
                          >
                            {isTR ? "İptal" : "Cancel"}
                          </button>
                        </div>
                      </div>
                    )}

                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => setDraggedLeadId(lead.id)}
                        onDragEnd={() => { setDraggedLeadId(null); setDragOverStageId(null) }}
                        onClick={() => router.push(`/${lang}/leadler/${lead.id}`)}
                        className={`bg-white border border-surface-300 rounded-card-sm p-3 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all ${draggedLeadId === lead.id ? "opacity-40 rotate-1" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-ui font-medium text-ink leading-snug flex-1">{lead.title}</p>
                          {(() => {
                            const ch = lead.attributes?.channel || "whatsapp"
                            const cfg = CHANNEL_CONFIG[ch]
                            return cfg ? (
                              <span
                                className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: cfg.color + "20", color: cfg.color }}
                                title={cfg.label}
                              >
                                {cfg.icon}
                              </span>
                            ) : null
                          })()}
                        </div>
                        {(lead.value ?? 0) > 0 && (
                          <p className="text-caption font-semibold text-primary mt-1">₺{lead.value!.toLocaleString("tr-TR")}</p>
                        )}
                        {lead.contact_name && (
                          <p className="text-micro text-ink-tertiary mt-1.5">{lead.contact_name}</p>
                        )}
                        {lead.assigned_user_name && (
                          <div className="flex justify-end mt-1.5">
                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[9px] font-bold" title={lead.assigned_user_name}>
                              {lead.assigned_user_name.charAt(0).toUpperCase()}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {stageLeads.length === 0 && !isAdding && (
                      <button
                        onClick={() => { setAddingToStage(stage.id); setNewLeadTitle("") }}
                        className="w-full py-5 border-2 border-dashed border-surface-300 rounded-card-sm text-caption text-ink-tertiary hover:border-primary/30 hover:text-primary/60 transition-colors"
                      >
                        {isTR ? "+ Lead ekle" : "+ Add lead"}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Pipeline Confirm Modal */}
      {deleteTarget && (
        <div className="ds-modal-overlay" onClick={() => !deletingId && setDeleteTarget(null)}>
          <div className="ds-modal w-[400px] max-w-[95vw]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-surface-300 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-red-500">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
              <h3 className="ds-modal-title">{isTR ? "Pipeline'ı Sil" : "Delete Pipeline"}</h3>
            </div>
            <div className="p-5">
              <p className="text-ui text-ink-secondary">
                {isTR ? `"${deleteTarget.name}" pipeline'ını ve tüm aşamalarını silmek istediğinize emin misiniz?` : `Are you sure you want to delete "${deleteTarget.name}" and all its stages?`}
              </p>
            </div>
            <div className="px-5 py-4 border-t border-surface-300 flex justify-end gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={!!deletingId} className="px-4 py-2 text-ui font-medium text-ink-secondary bg-surface-150 hover:bg-surface-200 rounded-btn transition-colors">
                {t("cancel")}
              </button>
              <button onClick={() => deletePipeline(deleteTarget)} disabled={!!deletingId} className="px-4 py-2 text-ui font-medium text-white bg-red-500 hover:bg-red-600 rounded-btn transition-colors disabled:opacity-50">
                {deletingId ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
