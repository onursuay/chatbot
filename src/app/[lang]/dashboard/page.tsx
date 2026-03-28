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

export default function DashboardPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [kpi, setKpi] = useState<KPI>({ total_leads: 0, active_deals_value: 0, tasks_due_today: 0, conversion_rate: 0 })
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([])
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const fetchData = async () => {
      try {
        const [widgetsData, kpiData, pipelinesData, activitiesData] = await Promise.all([
          api<Widget[]>("/crm/widgets", { token }).catch(() => []),
          api<KPI>("/crm/kpi", { token }).catch(() => ({ total_leads: 0, active_deals_value: 0, tasks_due_today: 0, conversion_rate: 0 })),
          api<PipelineSummary[]>("/pipelines", { token }).catch(() => []),
          api<ActivityItem[]>("/crm/activity-logs?limit=10", { token }).catch(() => []),
        ])
        setWidgets(widgetsData)
        setKpi(kpiData)
        setPipelines(pipelinesData)
        setActivities(activitiesData)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [getToken])

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
      iconBg: "bg-primary/8",
    },
    {
      label: t("active_deals_value"),
      value: `$${kpi.active_deals_value.toLocaleString()}`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
      accent: "text-emerald-600",
      iconBg: "bg-emerald-50",
    },
    {
      label: t("tasks_due_today"),
      value: kpi.tasks_due_today,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
      accent: "text-amber-600",
      iconBg: "bg-amber-50",
    },
    {
      label: t("conversion_rate"),
      value: `${kpi.conversion_rate}%`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path d="M18 20V10M12 20V4M6 20v-6" />
        </svg>
      ),
      accent: "text-violet-600",
      iconBg: "bg-violet-50",
    },
  ]

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Page Header */}
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("dashboard")}</h2>
          <p className="ds-page-subtitle">AI-powered business overview</p>
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
                <p className="text-caption-medium text-surface-500 uppercase tracking-wider">{card.label}</p>
                <div className={`w-9 h-9 rounded-[6px] ${card.iconBg} ${card.accent} flex items-center justify-center`}>
                  {card.icon}
                </div>
              </div>
              <p className={`text-kpi ${card.accent}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Pipeline Summary */}
        <div className="ds-card">
          <div className="px-5 py-4 border-b border-surface-200">
            <h3 className="ds-section-title">{t("pipeline_summary")}</h3>
          </div>
          <div className="p-5">
            {pipelines.length === 0 ? (
              <div className="ds-empty-state py-8">
                <div className="ds-empty-state-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-surface-300">
                    <path d="M3 3h5v18H3zM10 3h5v18h-5zM17 3h5v18h-5z" />
                  </svg>
                </div>
                <p className="ds-empty-state-title">{t("no_pipelines")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pipelines.map((p) => (
                  <div key={p.id} className="bg-surface-50 rounded-card-sm p-4 border border-surface-200 hover:border-surface-300 transition-colors">
                    <p className="text-body-medium text-ink">{p.name}</p>
                    <div className="flex justify-between mt-2.5">
                      <span className="text-caption text-surface-500">{p.leads_count} {t("leads")}</span>
                      <span className="text-caption-medium text-primary">${p.total_value.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="ds-card">
          <div className="px-5 py-4 border-b border-surface-200">
            <h3 className="ds-section-title">{t("recent_activity")}</h3>
          </div>
          <div className="p-5">
            {activities.length === 0 ? (
              <div className="ds-empty-state py-8">
                <div className="ds-empty-state-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-surface-300">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p className="ds-empty-state-title">{t("no_activity")}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2.5 px-2 rounded-[6px] hover:bg-surface-50 transition-colors">
                    <div className="w-8 h-8 rounded-avatar bg-primary flex items-center justify-center text-white text-micro font-bold flex-shrink-0">
                      {a.user_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ui text-ink">
                        <span className="font-bold">{a.user_name}</span>{" "}
                        <span className="text-surface-500">{a.action}</span>{" "}
                        <span className="text-primary font-medium">{a.entity_title}</span>
                      </p>
                      <p className="text-micro text-surface-400 mt-0.5">
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
            <div className="px-5 py-4 border-b border-surface-200">
              <h3 className="ds-section-title">{t("custom_widgets")}</h3>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {widgets.map((w) => (
                <div key={w.id} className="bg-surface-50 rounded-card-sm p-4 border border-surface-200 hover:border-surface-300 transition-colors">
                  <p className="text-body-medium text-ink">{w.title}</p>
                  <p className="text-micro text-surface-400 mt-1">{w.type}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
