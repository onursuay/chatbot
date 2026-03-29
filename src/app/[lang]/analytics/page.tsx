"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface AnalyticsData {
  overview: {
    total_conversations: number
    open_conversations: number
    resolved_conversations: number
    total_messages: number
    inbound_messages: number
    outbound_messages: number
    bot_messages: number
    agent_messages: number
    total_contacts: number
    total_broadcasts: number
  }
  daily_chart: { date: string; inbound: number; outbound: number }[]
}

export default function AnalyticsPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<AnalyticsData>("/analytics", { token })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [getToken])

  const o = data?.overview

  const stats = o ? [
    { label: t("total_messages"), value: o.total_messages, accent: "text-ink", iconBg: "bg-surface-100", icon: "msg" },
    { label: t("inbound_messages"), value: o.inbound_messages, accent: "text-blue-400", iconBg: "bg-blue-500/10", icon: "in" },
    { label: t("outbound_messages"), value: o.outbound_messages, accent: "text-primary", iconBg: "bg-primary/8", icon: "out" },
    { label: t("active_conversations"), value: o.open_conversations, accent: "text-amber-400", iconBg: "bg-amber-500/10", icon: "active" },
    { label: t("resolved_conversations"), value: o.resolved_conversations, accent: "text-emerald-400", iconBg: "bg-emerald-500/10", icon: "resolved" },
    { label: t("total_contacts"), value: o.total_contacts, accent: "text-violet-400", iconBg: "bg-violet-500/10", icon: "contacts" },
    { label: t("bot_messages"), value: o.bot_messages, accent: "text-primary", iconBg: "bg-primary/8", icon: "bot" },
    { label: t("agent_messages"), value: o.agent_messages, accent: "text-orange-400", iconBg: "bg-orange-500/10", icon: "agent" },
  ] : []

  const botRate = o && o.outbound_messages > 0
    ? Math.round((o.bot_messages / o.outbound_messages) * 100)
    : 0

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Page Header */}
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("reports")}</h2>
          <p className="ds-page-subtitle">Performance & analytics overview</p>
        </div>
      </div>

      <div className="p-7 space-y-6">
        {loading ? (
          <div className="ds-empty-state">
            <div className="w-8 h-8 rounded-[6px] bg-primary/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse-soft" />
            </div>
            <p className="ds-empty-state-title mt-3">{t("loading")}</p>
          </div>
        ) : !data ? (
          <div className="ds-empty-state">
            <div className="ds-empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-ink-tertiary">
                <path d="M18 20V10M12 20V4M6 20v-6" />
              </svg>
            </div>
            <p className="ds-empty-state-title">{t("data_load_error")}</p>
          </div>
        ) : (
          <>
            {/* KPI Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="ds-kpi-card animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-caption-medium text-ink-secondary">{stat.label}</p>
                    <div className={`w-8 h-8 rounded-[6px] ${stat.iconBg} ${stat.accent} flex items-center justify-center`}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                        {stat.icon === "msg" && <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />}
                        {stat.icon === "in" && <><path d="M12 5v14" /><path d="M19 12l-7 7-7-7" /></>}
                        {stat.icon === "out" && <><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></>}
                        {stat.icon === "active" && <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>}
                        {stat.icon === "resolved" && <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></>}
                        {stat.icon === "contacts" && <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></>}
                        {stat.icon === "bot" && <><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M12 8V4" /><circle cx="12" cy="3" r="1" /></>}
                        {stat.icon === "agent" && <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></>}
                      </svg>
                    </div>
                  </div>
                  <p className={`text-kpi-sm ${stat.accent}`}>{stat.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bot Resolution */}
              <div className="ds-card p-5">
                <p className="text-caption-medium text-ink-secondary mb-2">{t("bot_resolution_rate")}</p>
                <p className="text-kpi text-primary">{botRate}%</p>
                <div className="w-full bg-surface-100 rounded-full h-2 mt-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primary to-primary-light h-2 rounded-full transition-all duration-700"
                    style={{ width: `${botRate}%` }}
                  />
                </div>
              </div>

              {/* Total Conversations */}
              <div className="ds-card p-5">
                <p className="text-caption-medium text-ink-secondary mb-2">{t("total_conversations")}</p>
                <p className="text-kpi text-ink">{o?.total_conversations}</p>
                <div className="flex gap-3 mt-2.5">
                  <span className="ds-badge-warning">{o?.open_conversations} {t("open")}</span>
                  <span className="ds-badge-success">{o?.resolved_conversations} {t("resolved")}</span>
                </div>
              </div>

              {/* Campaigns */}
              <div className="ds-card p-5">
                <p className="text-caption-medium text-ink-secondary mb-2">{t("campaigns")}</p>
                <p className="text-kpi text-ink">{o?.total_broadcasts}</p>
                <p className="text-caption text-ink-tertiary mt-2">{t("total_sent_campaigns")}</p>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="ds-card p-5">
              <h3 className="ds-section-title mb-5">{t("last_7_days")}</h3>
              <div className="flex items-end gap-3 h-44">
                {data.daily_chart.map((day) => {
                  const maxVal = Math.max(...data.daily_chart.map((d) => d.inbound + d.outbound), 1)
                  const height = ((day.inbound + day.outbound) / maxVal) * 100
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full flex flex-col items-center justify-end" style={{ height: "140px" }}>
                        <div
                          className="w-full max-w-[44px] bg-primary/8 rounded-t-lg relative group transition-all duration-200 hover:bg-primary/12"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-surface-200 text-ink text-[10px] px-2 py-1 rounded-badge opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-surface-300">
                            {day.inbound + day.outbound} {t("messages_count")}
                          </div>
                          <div
                            className="absolute bottom-0 w-full bg-gradient-to-t from-primary to-primary-light rounded-t-lg transition-all duration-300"
                            style={{ height: day.inbound > 0 ? `${(day.inbound / (day.inbound + day.outbound || 1)) * 100}%` : "0%" }}
                          />
                        </div>
                      </div>
                      <span className="text-micro text-ink-tertiary">{day.date}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-5 mt-5 pt-4 border-t border-surface-300">
                <span className="flex items-center gap-2 text-caption text-ink-secondary">
                  <span className="w-3 h-3 bg-primary rounded" />
                  {t("incoming")}
                </span>
                <span className="flex items-center gap-2 text-caption text-ink-secondary">
                  <span className="w-3 h-3 bg-primary/10 rounded" />
                  {t("outgoing")}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
