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
      <div className="p-4 border-b border-gray-200 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-900 transition text-sm"
        >
          ← {t("back_to_pipeline")}
        </button>
        <h2 className="text-lg font-semibold text-gray-900 flex-1">{lead.title}</h2>
        <div className="flex gap-2">
          {lead.status === "active" && (
            <>
              <button
                onClick={() => handleCloseAs("won")}
                className="bg-green-600 hover:bg-green-700 text-gray-900 text-xs px-3 py-1.5 rounded-lg transition"
              >
                {t("close_won")}
              </button>
              <button
                onClick={() => handleCloseAs("lost")}
                className="bg-red-600 hover:bg-red-700 text-gray-900 text-xs px-3 py-1.5 rounded-lg transition"
              >
                {t("close_lost")}
              </button>
            </>
          )}
          {lead.status !== "active" && (
            <span className={`text-xs px-3 py-1.5 rounded-lg font-bold ${
              lead.status === "won" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            }`}>
              {lead.status === "won" ? t("won") : t("lost")}
            </span>
          )}
        </div>
      </div>

      {/* Tag bar */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-2 flex-wrap">
        {lead.tags.map((tag) => (
          <span key={tag} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded">
            #{tag}
          </span>
        ))}
        <button className="text-gray-400 hover:text-primary text-xs transition">
          {t("add_tag")}
        </button>
      </div>

      {/* Pipeline stage selector + progress bar */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <select
            value={lead.stage_id}
            onChange={(e) => handleStageChange(e.target.value)}
            className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="text-gray-400 text-xs">{pipeline?.name}</span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5">
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
                i <= currentStageIndex ? "text-primary" : "text-gray-400"
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
        <div className="w-[380px] border-r border-gray-200 overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("main")}
              className={`px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "main"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t("main_tab")}
            </button>
            <button
              onClick={() => setActiveTab("feed")}
              className={`px-4 py-2.5 text-sm font-medium transition ${
                activeTab === "feed"
                  ? "text-primary border-b-2 border-primary"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {t("feed_tab")}
            </button>
          </div>

          {activeTab === "main" ? (
            <div className="p-4 space-y-5">
              {/* Sorumlu kullanıcı */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">{t("responsible_user")}</span>
                <span className="text-gray-900 text-sm font-medium">
                  {lead.assigned_user_name || t("unassigned")}
                </span>
              </div>

              {/* Satış değeri */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">{t("sales_value")}</span>
                <span className="text-gray-900 text-sm font-medium">
                  {lead.value?.toLocaleString("tr-TR") || "0"} {lead.currency === "TRY" ? "₺" : lead.currency}
                </span>
              </div>

              {/* Lead Score */}
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">{t("lead_score_label")}</span>
                <span className="text-primary text-sm font-bold">{lead.score}/100</span>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200" />

              {/* Bağlantılı Kişi */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-gray-400">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                  </svg>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">{t("add_connection")}</span>
                </div>
                {contact ? (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="text-gray-900 text-sm font-medium">{contact.name || contact.phone}</p>
                    {contact.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{t("work_phone")}</span>
                        <span className="text-gray-600 text-xs">{contact.phone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{t("work_email")}</span>
                        <span className="text-gray-600 text-xs">{contact.email}</span>
                      </div>
                    )}
                    {contact.title && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{t("position")}</span>
                        <span className="text-gray-600 text-xs">{contact.title}</span>
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
              <div className="border-t border-gray-200" />

              {/* Bağlantılı Şirket */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 text-gray-400">
                    <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" />
                  </svg>
                  <span className="text-gray-500 text-xs uppercase tracking-wider">{t("company_name_label")}</span>
                </div>
                {company ? (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <p className="text-gray-900 text-sm font-medium">{company.name}</p>
                    {company.industry && (
                      <span className="text-gray-500 text-xs">{company.industry}</span>
                    )}
                    {company.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{t("work_phone")}</span>
                        <span className="text-gray-600 text-xs">{company.phone}</span>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-xs">{t("work_email")}</span>
                        <span className="text-gray-600 text-xs">{company.email}</span>
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
              <div className="border-t border-gray-200" />

              {/* Meta bilgiler */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{t("created_date")}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(lead.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">{t("last_activity")}</span>
                  <span className="text-gray-500 text-xs">
                    {new Date(lead.updated_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Feed Tab — Sol panel, setup/stats gösterilecek */
            <div className="p-4 text-gray-400 text-sm">
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
                <p className="text-gray-400 text-sm">{t("no_activity")}</p>
              </div>
            )}
            {activities.map((act) => (
              <div key={act.id} className="flex gap-3">
                {/* Avatar dot */}
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-[10px] font-bold shrink-0 mt-0.5">
                  {act.user_name?.charAt(0)?.toUpperCase() || "S"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 text-xs font-medium">{act.user_name || "Sistem"}</span>
                    <span className="text-gray-400 text-[10px]">
                      {new Date(act.created_at).toLocaleString("tr-TR", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-gray-500 text-xs mt-0.5">
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
          <div className="border-t border-gray-200 p-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t("note_placeholder")}
                rows={3}
                className="w-full bg-transparent text-gray-900 text-sm placeholder-gray-400 resize-none focus:outline-none"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim() || saving}
                    className="bg-primary hover:bg-primary/90 text-gray-900 text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    {saving ? t("saving") : t("add_note")}
                  </button>
                  <button
                    onClick={() => setNoteText("")}
                    className="text-gray-400 text-xs hover:text-gray-900 transition px-3 py-2"
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
