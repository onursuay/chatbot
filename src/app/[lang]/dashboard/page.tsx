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
    { label: t("total_leads"), value: kpi.total_leads, color: "text-brand-400" },
    { label: t("active_deals_value"), value: `$${kpi.active_deals_value.toLocaleString()}`, color: "text-green-400" },
    { label: t("tasks_due_today"), value: kpi.tasks_due_today, color: "text-yellow-400" },
    { label: t("conversion_rate"), value: `${kpi.conversion_rate}%`, color: "text-purple-400" },
  ]

  return (
    <div className="h-screen flex flex-col overflow-y-auto">
      <div className="p-6 border-b border-dark-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">{t("dashboard")}</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <div key={card.label} className="bg-dark-900 rounded-lg p-5 border border-dark-800">
              <p className="text-dark-400 text-xs uppercase mb-2">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Pipeline Summary */}
        <div className="bg-dark-900 rounded-lg border border-dark-800">
          <div className="p-4 border-b border-dark-800">
            <h3 className="text-white font-semibold text-sm">{t("pipeline_summary")}</h3>
          </div>
          <div className="p-4">
            {pipelines.length === 0 ? (
              <p className="text-center text-dark-600 text-[14px] py-4">{t("no_pipelines")}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pipelines.map((p) => (
                  <div key={p.id} className="bg-dark-800/50 rounded-lg p-4">
                    <p className="text-white text-sm font-medium">{p.name}</p>
                    <div className="flex justify-between mt-2">
                      <span className="text-dark-400 text-xs">{p.leads_count} {t("leads")}</span>
                      <span className="text-brand-400 text-xs font-medium">${p.total_value.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-dark-900 rounded-lg border border-dark-800">
          <div className="p-4 border-b border-dark-800">
            <h3 className="text-white font-semibold text-sm">{t("recent_activity")}</h3>
          </div>
          <div className="p-4">
            {activities.length === 0 ? (
              <p className="text-center text-dark-600 text-[14px] py-4">{t("no_activity")}</p>
            ) : (
              <div className="space-y-3">
                {activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
                      {a.user_name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="font-medium">{a.user_name}</span>{" "}
                        <span className="text-dark-400">{a.action}</span>{" "}
                        <span className="text-brand-400">{a.entity_title}</span>
                      </p>
                      <p className="text-xs text-dark-500 mt-0.5">
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
          <div className="bg-dark-900 rounded-lg border border-dark-800">
            <div className="p-4 border-b border-dark-800">
              <h3 className="text-white font-semibold text-sm">{t("custom_widgets")}</h3>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {widgets.map((w) => (
                <div key={w.id} className="bg-dark-800/50 rounded-lg p-4">
                  <p className="text-white text-sm font-medium">{w.title}</p>
                  <p className="text-dark-500 text-xs mt-1">{w.type}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
