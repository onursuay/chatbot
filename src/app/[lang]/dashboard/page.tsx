"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface Widget {
  id: string
  type: string
  title: string
  position: number
  config: Record<string, any>
}

interface KPI {
  total_leads: number
  active_deals_value: number
  tasks_due_today: number
  conversion_rate: number
}

interface PipelineSummary {
  id: string
  name: string
  leads_count: number
  total_value: number
}

interface ActivityItem {
  id: string
  user_name: string
  action: string
  entity_type: string
  entity_title: string
  created_at: string
}

interface ChannelStats {
  whatsapp: { sent: number; received: number; connected: boolean }
  instagram: { sent: number; received: number; connected: boolean }
  facebook: { sent: number; received: number; connected: boolean }
  messenger: { sent: number; received: number; connected: boolean }
}

export default function DashboardPage() {
  const { getToken } = useAuth()
  const { t, lang } = useI18n()
  const isTR = lang === "tr"
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [kpi, setKpi] = useState<KPI>({ total_leads: 0, active_deals_value: 0, tasks_due_today: 0, conversion_rate: 0 })
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [channelStats, setChannelStats] = useState<ChannelStats>({
    whatsapp: { sent: 0, received: 0, connected: false },
    instagram: { sent: 0, received: 0, connected: false },
    facebook: { sent: 0, received: 0, connected: false },
    messenger: { sent: 0, received: 0, connected: false },
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const fetchData = async () => {
      try {
        const [widgetsData, kpiData, pipelinesData, activitiesData, channelData] = await Promise.all([
          api<Widget[]>("/crm/widgets", { token }).catch(() => []),
          api<KPI>("/crm/kpi", { token }).catch(() => ({ total_leads: 0, active_deals_value: 0, tasks_due_today: 0, conversion_rate: 0 })),
          api<PipelineSummary[]>("/pipelines", { token }).catch(() => []),
          api<ActivityItem[]>("/crm/activity-logs?limit=10", { token }).catch(() => []),
          api<ChannelStats>("/channels/stats", { token }).catch(() => ({
            whatsapp: { sent: 0, received: 0, connected: false },
            instagram: { sent: 0, received: 0, connected: false },
            facebook: { sent: 0, received: 0, connected: false },
            messenger: { sent: 0, received: 0, connected: false },
          })),
        ])
        setWidgets(widgetsData)
        setKpi(kpiData)
        setPipelines(pipelinesData)
        setActivities(activitiesData)
        setChannelStats(channelData)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [getToken])

  const totalMessages = Object.values(channelStats).reduce((sum, ch) => sum + ch.sent + ch.received, 0)
  const totalSent = Object.values(channelStats).reduce((sum, ch) => sum + ch.sent, 0)
  const totalReceived = Object.values(channelStats).reduce((sum, ch) => sum + ch.received, 0)
  const connectedChannels = Object.values(channelStats).filter(ch => ch.connected).length

  const kpiCards = [
    {
      label: t("total_leads"),
      value: kpi.total_leads,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      accent: "text-primary",
      iconBg: "bg-primary-50",
      change: null,
    },
    {
      label: t("active_deals_value"),
      value: `₺${kpi.active_deals_value.toLocaleString("tr-TR")}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
      accent: "text-emerald-700",
      iconBg: "bg-emerald-50",
      change: null,
    },
    {
      label: t("tasks_due_today"),
      value: kpi.tasks_due_today,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
      accent: "text-amber-700",
      iconBg: "bg-amber-50",
      change: null,
    },
    {
      label: t("conversion_rate"),
      value: `${kpi.conversion_rate}%`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      ),
      accent: "text-violet-700",
      iconBg: "bg-violet-50",
      change: null,
    },
  ]

  const channels = [
    {
      name: "WhatsApp",
      color: "#25D366",
      bgColor: "bg-[#25D366]/10",
      stats: channelStats.whatsapp,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.477A11.929 11.929 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.16 0-4.16-.69-5.795-1.862l-.415-.298-2.735.874.876-2.685-.326-.443A9.724 9.724 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/>
        </svg>
      ),
    },
    {
      name: "Instagram",
      color: "#E1306C",
      bgColor: "bg-[#E1306C]/10",
      stats: channelStats.instagram,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      ),
    },
    {
      name: "Facebook",
      color: "#4267B2",
      bgColor: "bg-[#4267B2]/10",
      stats: channelStats.facebook,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      name: "Messenger",
      color: "#0084FF",
      bgColor: "bg-[#0084FF]/10",
      stats: channelStats.messenger,
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.733 8.3l3.13 3.259L19.752 8.3l-6.559 6.663z"/>
        </svg>
      ),
    },
  ]

  // AI-powered suggestions
  const suggestions = [
    {
      type: "warning" as const,
      titleTR: "Yanitsiz Mesajlar",
      titleEN: "Unanswered Messages",
      descTR: "Son 24 saatte yanitsiz kalan mesajlariniz var. Musteri memnuniyeti icin hizli donusum onemli.",
      descEN: "You have unanswered messages in the last 24 hours. Quick response is important for customer satisfaction.",
      actionTR: "Gelen Kutusuna Git",
      actionEN: "Go to Inbox",
      href: `/${lang}/${isTR ? "gelen-kutusu" : "inbox"}`,
    },
    {
      type: "tip" as const,
      titleTR: "AI Chatbot Onerisi",
      titleEN: "AI Chatbot Suggestion",
      descTR: "Sikca sorulan sorulara otomatik yanit vermek icin AI chatbot kurulumu yapin. Yanitlama suresini %60 azaltabilirsiniz.",
      descEN: "Set up AI chatbot for frequently asked questions. You can reduce response time by 60%.",
      actionTR: "Chatbot Ayarlari",
      actionEN: "Chatbot Settings",
      href: `/${lang}/${isTR ? "yapay-zeka/chatbot" : "ai/chatbot"}`,
    },
    {
      type: "growth" as const,
      titleTR: "CRM Pipeline",
      titleEN: "CRM Pipeline",
      descTR: "Pipeline'inizi duzenlemeyi deneyin. Musteri segmentasyonu ile donusum oranlarini artirabilirsiniz.",
      descEN: "Try organizing your pipeline. You can increase conversion rates with customer segmentation.",
      actionTR: "Pipeline'i Goruntule",
      actionEN: "View Pipeline",
      href: `/${lang}/crm/pipeline`,
    },
  ]

  const suggestionStyles = {
    warning: { border: "border-amber-200", bg: "bg-amber-50", iconColor: "text-amber-600", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
    tip: { border: "border-violet-200", bg: "bg-violet-50", iconColor: "text-violet-600", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M12 2v1M12 21v1M4.22 4.22l.71.71M18.36 18.36l.71.71M1 12h1M21 12h1M4.22 19.78l.71-.71M18.36 5.64l.71-.71"/><circle cx="12" cy="12" r="5"/></svg> },
    growth: { border: "border-primary/30", bg: "bg-primary-50", iconColor: "text-primary", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> },
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Page Header */}
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("dashboard")}</h2>
          <p className="ds-page-subtitle">{t("dashboard_subtitle")}</p>
        </div>
      </div>

      <div className="p-7 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, i) => (
            <div
              key={card.label}
              className="ds-kpi-card animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-caption-medium text-ink-secondary uppercase tracking-wider">{card.label}</p>
                <div className={`w-9 h-9 rounded-[6px] ${card.iconBg} ${card.accent} flex items-center justify-center`}>
                  {card.icon}
                </div>
              </div>
              <p className={`text-kpi ${card.accent}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Channel Performance Overview */}
        <div className="ds-card">
          <div className="px-5 py-4 border-b border-surface-300 flex items-center justify-between">
            <div>
              <h3 className="ds-section-title">{isTR ? "Kanal Performansi" : "Channel Performance"}</h3>
              <p className="text-caption text-ink-tertiary mt-0.5">{isTR ? "Son 30 gun" : "Last 30 days"}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-micro text-ink-tertiary uppercase tracking-wider">{isTR ? "Toplam Mesaj" : "Total Messages"}</p>
                <p className="text-body-medium text-ink font-bold">{totalMessages.toLocaleString("tr-TR")}</p>
              </div>
              <div className="text-right">
                <p className="text-micro text-ink-tertiary uppercase tracking-wider">{isTR ? "Bagli Kanal" : "Connected"}</p>
                <p className="text-body-medium text-primary font-bold">{connectedChannels}/4</p>
              </div>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {channels.map((ch) => (
              <div key={ch.name} className="rounded-xl border border-surface-300 p-4 hover:border-surface-400 transition-all hover:shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${ch.bgColor} flex items-center justify-center`} style={{ color: ch.color }}>
                    {ch.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-body-medium text-ink font-semibold">{ch.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${ch.stats.connected ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="text-micro text-ink-tertiary">{ch.stats.connected ? (isTR ? "Bagli" : "Connected") : (isTR ? "Bagli Degil" : "Not Connected")}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-150 rounded-lg p-2.5">
                    <p className="text-micro text-ink-tertiary">{isTR ? "Gelen" : "Received"}</p>
                    <p className="text-body-medium text-ink font-bold">{ch.stats.received.toLocaleString("tr-TR")}</p>
                  </div>
                  <div className="bg-surface-150 rounded-lg p-2.5">
                    <p className="text-micro text-ink-tertiary">{isTR ? "Giden" : "Sent"}</p>
                    <p className="text-body-medium text-ink font-bold">{ch.stats.sent.toLocaleString("tr-TR")}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Two Column: AI Suggestions + Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Suggestions & Recommendations */}
          <div className="ds-card">
            <div className="px-5 py-4 border-b border-surface-300 flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-violet-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-violet-600">
                  <rect x="3" y="8" width="18" height="12" rx="2" /><path d="M12 8V4" /><circle cx="12" cy="3" r="1" /><circle cx="8" cy="14" r="1.5" fill="currentColor" /><circle cx="16" cy="14" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <div>
                <h3 className="ds-section-title">{isTR ? "AI Oneriler & Performans" : "AI Suggestions & Performance"}</h3>
                <p className="text-micro text-ink-tertiary">{isTR ? "Yapay zeka destekli oneriler" : "AI-powered recommendations"}</p>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {suggestions.map((s, i) => {
                const style = suggestionStyles[s.type]
                return (
                  <div key={i} className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 mt-0.5 ${style.iconColor}`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ui font-semibold text-ink mb-1">{isTR ? s.titleTR : s.titleEN}</p>
                        <p className="text-caption text-ink-secondary leading-relaxed">{isTR ? s.descTR : s.descEN}</p>
                        <a href={s.href} className="inline-flex items-center gap-1 mt-2.5 text-caption-medium text-primary hover:text-primary-hover transition-colors">
                          {isTR ? s.actionTR : s.actionEN}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Pipeline Summary */}
          <div className="ds-card">
            <div className="px-5 py-4 border-b border-surface-300">
              <h3 className="ds-section-title">{t("pipeline_summary")}</h3>
              <p className="text-micro text-ink-tertiary mt-0.5">{isTR ? "CRM satis hunisi durumu" : "CRM sales pipeline status"}</p>
            </div>
            <div className="p-5">
              {pipelines.length === 0 ? (
                <div className="ds-empty-state py-8">
                  <div className="ds-empty-state-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-ink-tertiary">
                      <path d="M3 3h5v18H3zM10 3h5v18h-5zM17 3h5v18h-5z" />
                    </svg>
                  </div>
                  <p className="ds-empty-state-title">{t("no_pipelines")}</p>
                  <a href={`/${lang}/crm/pipeline`} className="text-caption-medium text-primary hover:text-primary-hover mt-2 inline-block transition-colors">
                    {isTR ? "Pipeline Olustur" : "Create Pipeline"} &rarr;
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  {pipelines.map((p) => {
                    const percentage = kpi.total_leads > 0 ? Math.round((p.leads_count / kpi.total_leads) * 100) : 0
                    return (
                      <div key={p.id} className="bg-surface-150 rounded-xl p-4 border border-surface-300 hover:border-surface-400 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-body-medium text-ink font-semibold">{p.name}</p>
                          <span className="text-caption-medium text-primary">₺{p.total_value.toLocaleString("tr-TR")}</span>
                        </div>
                        <div className="flex items-center justify-between text-caption text-ink-secondary mb-2">
                          <span>{p.leads_count} {t("leads")}</span>
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-surface-300 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${Math.max(percentage, 3)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messaging Performance Summary */}
        <div className="ds-card">
          <div className="px-5 py-4 border-b border-surface-300">
            <h3 className="ds-section-title">{isTR ? "Mesajlasma Performansi" : "Messaging Performance"}</h3>
            <p className="text-micro text-ink-tertiary mt-0.5">{isTR ? "Genel mesajlasma metrikleri" : "Overall messaging metrics"}</p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: isTR ? "Toplam Mesaj" : "Total Messages", value: totalMessages, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, color: "text-primary", bg: "bg-primary-50" },
                { label: isTR ? "Gelen Mesaj" : "Received", value: totalReceived, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>, color: "text-blue-600", bg: "bg-blue-50" },
                { label: isTR ? "Giden Mesaj" : "Sent", value: totalSent, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: isTR ? "Bagli Kanallar" : "Connected Channels", value: `${connectedChannels}/4`, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>, color: "text-violet-600", bg: "bg-violet-50" },
              ].map((m, i) => (
                <div key={i} className="bg-surface-150 rounded-xl p-4 border border-surface-300">
                  <div className={`w-9 h-9 rounded-lg ${m.bg} ${m.color} flex items-center justify-center mb-3`}>
                    {m.icon}
                  </div>
                  <p className="text-micro text-ink-tertiary uppercase tracking-wider mb-1">{m.label}</p>
                  <p className="text-xl font-bold text-ink">{typeof m.value === "number" ? m.value.toLocaleString("tr-TR") : m.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="ds-card">
          <div className="px-5 py-4 border-b border-surface-300">
            <h3 className="ds-section-title">{t("recent_activity")}</h3>
          </div>
          <div className="p-5">
            {activities.length === 0 ? (
              <div className="ds-empty-state py-8">
                <div className="ds-empty-state-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-ink-tertiary">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p className="ds-empty-state-title">{t("no_activity")}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2.5 px-2 rounded-[6px] hover:bg-surface-150 transition-colors">
                    <div className="w-8 h-8 rounded-avatar bg-primary flex items-center justify-center text-white text-micro font-bold flex-shrink-0">
                      {a.user_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ui text-ink">
                        <span className="font-bold">{a.user_name}</span>{" "}
                        <span className="text-ink-secondary">{a.action}</span>{" "}
                        <span className="text-primary font-medium">{a.entity_title}</span>
                      </p>
                      <p className="text-micro text-ink-tertiary mt-0.5">
                        {new Date(a.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Saved Widgets */}
        {widgets.length > 0 && (
          <div className="ds-card">
            <div className="px-5 py-4 border-b border-surface-300">
              <h3 className="ds-section-title">{t("custom_widgets")}</h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {widgets.map((w) => (
                <div key={w.id} className="bg-surface-150 rounded-card-sm p-4 border border-surface-300 hover:border-surface-400 transition-colors">
                  <p className="text-body-medium text-ink">{w.title}</p>
                  <p className="text-micro text-ink-tertiary mt-1">{w.type}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
