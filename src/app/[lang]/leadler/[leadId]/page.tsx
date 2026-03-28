"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface Lead {
  id: string
  title: string
  pipeline_id: string
  stage_id: string
  contact_id: string | null
  company_id: string | null
  assigned_to: string | null
  value: number
  currency: string
  status: string
  loss_reason: string | null
  tags: string[]
  score: number
  contact_name: string | null
  company_name: string | null
  assigned_user_name: string | null
  created_at: string
  updated_at: string
}

interface Contact {
  id: string
  name: string | null
  phone: string
  email: string | null
  title: string | null
  profile_name: string | null
}

interface Company {
  id: string
  name: string
  phone: string | null
  email: string | null
  industry: string | null
}

interface Stage {
  id: string
  name: string
  color: string
  sort_order: number
  is_win: boolean
  is_loss: boolean
}

interface Pipeline {
  id: string
  name: string
  stages: Stage[]
}

interface ActivityItem {
  id: string
  user_name: string | null
  action: string
  entity_type: string
  old_value: any
  new_value: any
  created_at: string
}

interface Note {
  id: string
  content: string
  user_id: string
  created_at: string
}

export default function LeadDetailPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const params = useParams()
  const leadId = params.leadId as string

  const [lead, setLead] = useState<Lead | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [noteText, setNoteText] = useState("")
  const [activeTab, setActiveTab] = useState<"main" | "feed">("main")
  const [saving, setSaving] = useState(false)

  // Lead verisi yükle
  useEffect(() => {
    const token = getToken()
    if (!token || !leadId) return

    // Lead detay - tek lead getir
    api<Lead>(`/leads?id=${leadId}`, { token }).then(setLead).catch(() => {})

    // Activity log
    api<ActivityItem[]>(`/crm/activity-logs?entity_type=lead&entity_id=${leadId}`, { token })
      .then(setActivities)
      .catch(() => {})
  }, [getToken, leadId])

  // Pipeline ve contact/company yükle
  useEffect(() => {
    const token = getToken()
    if (!token || !lead) return

    api<Pipeline[]>("/pipelines", { token }).then((pipes) => {
      const found = pipes.find((p) => p.id === lead.pipeline_id)
      if (found) setPipeline(found)
    }).catch(() => {})

    if (lead.contact_id) {
      api<Contact>(`/contacts/${lead.contact_id}`, { token }).then(setContact).catch(() => {})
    }
    if (lead.company_id) {
      api<Company>(`/companies/${lead.company_id}`, { token }).then(setCompany).catch(() => {})
    }
  }, [getToken, lead])

  const stages = pipeline?.stages?.sort((a, b) => a.sort_order - b.sort_order) || []
  const currentStage = stages.find((s) => s.id === lead?.stage_id)
  const currentStageIndex = stages.findIndex((s) => s.id === lead?.stage_id)
  const progressPercent = stages.length > 0 ? ((currentStageIndex + 1) / stages.length) * 100 : 0

  // Aşama değiştir
  const handleStageChange = async (stageId: string) => {
    const token = getToken()
    if (!token || !lead) return
    setSaving(true)
    try {
      await api<Lead>(`/leads`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ id: lead.id, stage_id: stageId }),
      })
      setLead((prev) => prev ? { ...prev, stage_id: stageId } : prev)
    } catch {}
    setSaving(false)
  }

  // Not ekle
  const handleAddNote = async () => {
    const token = getToken()
    if (!token || !lead || !noteText.trim()) return
    setSaving(true)
    try {
      // Activity log olarak kaydet
      await api("/crm/activity-logs", {
        token,
        method: "POST",
        body: JSON.stringify({
          entity_type: "lead",
          entity_id: lead.id,
          action: "note_added",
          new_value: { content: noteText },
        }),
      }).catch(() => {})
      setNoteText("")
      // Refresh activities
      const updated = await api<ActivityItem[]>(
        `/crm/activity-logs?entity_type=lead&entity_id=${leadId}`,
        { token }
      )
      setActivities(updated)
    } catch {}
    setSaving(false)
  }

  // Lead durumunu değiştir (won/lost)
  const handleCloseAs = async (status: "won" | "lost") => {
    const token = getToken()
    if (!token || !lead) return
    setSaving(true)
    try {
      await api(`/leads`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ id: lead.id, status }),
      })
      setLead((prev) => prev ? { ...prev, status } : prev)
    } catch {}
    setSaving(false)
  }

  if (!lead) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary">{t("loading")}</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-surface-300 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-ink-tertiary hover:text-ink transition text-sm"
        >
          ← {t("back_to_pipeline")}
        </button>
        <h2 className="text-lg font-bold text-ink flex-1">{lead.title}</h2>
        <div className="flex gap-2">
          {lead.status === "active" && (
            <>
              <button
                onClick={() => handleCloseAs("won")}
                className="ds-btn-primary ds-btn-sm"
              >
                {t("close_won")}
              </button>
              <button
                onClick={() => handleCloseAs("lost")}
                className="ds-btn-danger ds-btn-sm"
              >
                {t("close_lost")}
              </button>
            </>
          )}
          {lead.status !== "active" && (
            <span className={`${
              lead.status === "won" ? "ds-badge-success" : "ds-badge-danger"
            }`}>
              {lead.status === "won" ? t("won") : t("lost")}
            </span>
          )}
        </div>
      </div>

      {/* Tag bar */}
      <div className="px-4 py-2 border-b border-surface-300 flex items-center gap-2 flex-wrap">
        {lead.tags.map((tag) => (
          <span key={tag} className="ds-badge-primary">
            #{tag}
          </span>
        ))}
        <button className="ds-btn-ghost ds-btn-sm">
          {t("add_tag")}
        </button>
      </div>

      {/* Pipeline stage selector + progress bar */}
      <div className="px-4 py-3 border-b border-surface-300">
        <div className="flex items-center gap-3 mb-2">
          <select
            value={lead.stage_id}
            onChange={(e) => handleStageChange(e.target.value)}
            className="ds-select"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="text-ink-muted text-xs">{pipeline?.name}</span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-surface-150 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: currentStage?.color || "#3B82F6",
            }}
          />
        </div>
        {/* Stage dots */}
        <div className="flex justify-between mt-1">
          {stages.map((s, i) => (
            <button
              key={s.id}
              onClick={() => handleStageChange(s.id)}
              className={`text-[10px] transition ${
                i <= currentStageIndex ? "text-primary" : "text-ink-muted"
              }`}
              title={s.name}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main content: 2-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL — Lead info */}
        <div className="w-[380px] border-r border-surface-300 overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-surface-300">
            <button
              onClick={() => setActiveTab("main")}
              className={`px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "main"
                  ? "text-primary border-b-2 border-primary"
                  : "text-ink-tertiary hover:text-ink"
              }`}
            >
              {t("main_tab")}
            </button>
            <button
              onClick={() => setActiveTab("feed")}
              className={`px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "feed"
                  ? "text-primary border-b-2 border-primary"
                  : "text-ink-tertiary hover:text-ink"
              }`}
            >
              {t("feed_tab")}
            </button>
          </div>

          {activeTab === "main" ? (
            <div className="p-4 space-y-5">
              {/* Sorumlu kullanıcı */}
              <div className="flex items-center justify-between">
                <span className="text-ink-tertiary text-sm">{t("responsible_user")}</span>
                <span className="text-ink text-sm font-medium">
                  {lead.assigned_user_name || t("unassigned")}
                </span>
              </div>

              {/* Satış değeri */}
              <div className="flex items-center justify-between">
                <span className="text-ink-tertiary text-sm">{t("sales_value")}</span>
                <span className="text-ink text-sm font-medium">
                  {lead.value?.toLocaleString("tr-TR") || "0"} {lead.currency === "TRY" ? "₺" : lead.currency}
                </span>
              </div>

              {/* Lead Score */}
              <div className="flex items-center justify-between">
                <span className="text-ink-tertiary text-sm">{t("lead_score_label")}</span>
                <span className="text-primary text-sm font-bold">{lead.score}/100</span>
              </div>

              {/* Divider */}
              <div className="border-t border-surface-300" />

              {/* Bağlantılı Kişi */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ink-muted">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                  </svg>
                  <span className="text-ink-tertiary text-xs uppercase tracking-wider">{t("add_connection")}</span>
                </div>
                {contact ? (
                  <div className="bg-surface rounded-[6px] p-3 space-y-2">
                    <p className="text-ink text-sm font-medium">{contact.name || contact.phone}</p>
                    {contact.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted text-xs">{t("work_phone")}</span>
                        <span className="text-ink-secondary text-xs">{contact.phone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted text-xs">{t("work_email")}</span>
                        <span className="text-ink-secondary text-xs">{contact.email}</span>
                      </div>
                    )}
                    {contact.title && (
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted text-xs">{t("position")}</span>
                        <span className="text-ink-secondary text-xs">{contact.title}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="text-primary text-xs hover:underline">
                    + {t("link_contact")}
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-surface-300" />

              {/* Bağlantılı Şirket */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-ink-muted">
                    <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" />
                  </svg>
                  <span className="text-ink-tertiary text-xs uppercase tracking-wider">{t("company_name_label")}</span>
                </div>
                {company ? (
                  <div className="bg-surface rounded-[6px] p-3 space-y-2">
                    <p className="text-ink text-sm font-medium">{company.name}</p>
                    {company.industry && (
                      <span className="text-ink-tertiary text-xs">{company.industry}</span>
                    )}
                    {company.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted text-xs">{t("work_phone")}</span>
                        <span className="text-ink-secondary text-xs">{company.phone}</span>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-ink-muted text-xs">{t("work_email")}</span>
                        <span className="text-ink-secondary text-xs">{company.email}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="text-primary text-xs hover:underline">
                    + {t("link_company")}
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-surface-300" />

              {/* Meta bilgiler */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted text-xs">{t("created_date")}</span>
                  <span className="text-ink-tertiary text-xs">
                    {new Date(lead.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-muted text-xs">{t("last_activity")}</span>
                  <span className="text-ink-tertiary text-xs">
                    {new Date(lead.updated_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Feed Tab — Sol panel, setup/stats gösterilecek */
            <div className="p-4 text-ink-muted text-sm">
              {t("statistics_tab")}
            </div>
          )}
        </div>

        {/* RIGHT PANEL — Feed / Activity Timeline + Not ekleme */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Activity feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activities.length === 0 && (
              <div className="text-center py-8">
                <p className="text-ink-muted text-sm">{t("no_activity")}</p>
              </div>
            )}
            {activities.map((act) => (
              <div key={act.id} className="flex gap-3">
                {/* Avatar dot */}
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                  {act.user_name?.charAt(0)?.toUpperCase() || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-ink text-xs font-medium">{act.user_name || "Sistem"}</span>
                    <span className="text-ink-muted text-[10px]">
                      {new Date(act.created_at).toLocaleString("tr-TR", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-ink-tertiary text-xs mt-0.5">
                    {act.action === "note_added" && (
                      <span>
                        <span className="text-primary">{t("note_added")}: </span>
                        {act.new_value?.content || ""}
                      </span>
                    )}
                    {act.action === "stage_changed" && (
                      <span>
                        <span className="text-yellow-400">{t("stage_changed")}: </span>
                        {act.old_value?.stage || "—"} → {act.new_value?.stage || "—"}
                      </span>
                    )}
                    {act.action === "created" && (
                      <span className="text-green-400">{t("lead_created_log")}</span>
                    )}
                    {!["note_added", "stage_changed", "created"].includes(act.action) && (
                      <span>{act.action}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Not ekleme alanı */}
          <div className="border-t border-surface-300 p-4">
            <div className="bg-surface rounded-[6px] p-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t("note_placeholder")}
                rows={3}
                className="w-full bg-transparent text-ink text-sm placeholder-ink-tertiary resize-none focus:outline-none"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || saving}
                    className="ds-btn-primary ds-btn-sm disabled:opacity-50"
                  >
                    {saving ? t("saving") : t("add_note")}
                  </button>
                  <button
                    onClick={() => setNoteText("")}
                    className="ds-btn-ghost ds-btn-sm"
                  >
                    {t("cancel")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
