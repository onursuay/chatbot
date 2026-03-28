"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface ActivityLog {
  id: string
  user_name: string | null
  user_avatar: string | null
  action: string
  entity_type: string
  entity_id: string
  entity_title: string | null
  details: string | null
  created_at: string
}

export default function AktivitePage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filterEntityType, setFilterEntityType] = useState("")

  useEffect(() => {
    const token = getToken()
    if (!token) return

    const params = new URLSearchParams()
    if (filterEntityType) params.set("entity_type", filterEntityType)
    const q = params.toString() ? `?${params.toString()}` : ""

    api<ActivityLog[]>(`/crm/activity-logs${q}`, { token }).then(setLogs).catch(() => {})
  }, [getToken, filterEntityType])

  const entityTypeOptions = ["lead", "contact", "company", "task", "pipeline", "deal"]

  return (
    <div className="h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{t("activity_log")}</h2>
        <select
          value={filterEntityType}
          onChange={(e) => setFilterEntityType(e.target.value)}
          className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
        >
          <option value="">{t("all_entities")}</option>
          {entityTypeOptions.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {logs.length === 0 ? (
          <p className="text-center text-gray-400 text-[14px] py-8">{t("no_activity")}</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />

            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="relative flex items-start gap-4 pl-10">
                  {/* Timeline dot */}
                  <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-gray-100 border-2 border-primary" />

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                    {log.user_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{log.user_name || t("system")}</span>{" "}
                        <span className="text-gray-500">{log.action}</span>{" "}
                        {log.entity_title && (
                          <span className="text-primary font-medium">{log.entity_title}</span>
                        )}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-3">
                        {new Date(log.created_at).toLocaleString("tr-TR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded capitalize">
                        {log.entity_type}
                      </span>
                      {log.details && (
                        <span className="text-gray-400 text-xs">{log.details}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
