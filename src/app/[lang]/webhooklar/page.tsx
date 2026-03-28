"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  last_triggered_at: string | null
  failure_count: number
}

export default function WebhooklarPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [showForm, setShowForm] = useState(false)

  // Form fields
  const [formName, setFormName] = useState("")
  const [formUrl, setFormUrl] = useState("")
  const [formEvents, setFormEvents] = useState<string[]>([])
  const [formError, setFormError] = useState("")

  const eventOptions = [
    "lead.created",
    "lead.updated",
    "lead.stage_changed",
    "contact.created",
    "task.completed",
    "deal.won",
    "deal.lost",
  ]

  const fetchWebhooks = () => {
    const token = getToken()
    if (!token) return
    api<Webhook[]>("/crm/webhooks", { token }).then(setWebhooks).catch(() => {})
  }

  useEffect(() => {
    fetchWebhooks()
  }, [getToken])

  const handleToggleEvent = (event: string) => {
    setFormEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  const handleCreate = async () => {
    const token = getToken()
    if (!token) return
    setFormError("")

    try {
      await api("/crm/webhooks", {
        token,
        method: "POST",
        body: JSON.stringify({
          name: formName,
          url: formUrl,
          events: formEvents,
        }),
      })
      setShowForm(false)
      setFormName("")
      setFormUrl("")
      setFormEvents([])
      fetchWebhooks()
    } catch (err: any) {
      setFormError(err.message || t("error"))
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{t("webhooks")}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary hover:bg-primary/90 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          {t("create_webhook")}
        </button>
      </div>

      {/* Create Webhook Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-gray-900 font-semibold text-lg mb-4">{t("create_webhook")}</h3>
            {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}
            <div className="space-y-3">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("webhook_name")}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <input
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder={t("webhook_url")}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <div>
                <p className="text-gray-500 text-xs uppercase mb-2">{t("events")}</p>
                <div className="flex flex-wrap gap-2">
                  {eventOptions.map((event) => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => handleToggleEvent(event)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                        formEvents.includes(event)
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-gray-100 border-gray-300 text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-900 text-sm px-4 py-2.5 transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                className="bg-primary hover:bg-primary/90 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
              >
                {t("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase">
              <th className="text-left p-4">{t("name")}</th>
              <th className="text-left p-4">{t("url")}</th>
              <th className="text-left p-4">{t("events")}</th>
              <th className="text-left p-4">{t("status")}</th>
              <th className="text-left p-4">{t("last_triggered")}</th>
              <th className="text-left p-4">{t("failures")}</th>
            </tr>
          </thead>
          <tbody>
            {webhooks.map((wh) => (
              <tr key={wh.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                <td className="p-4 text-[14px] text-gray-900 font-medium">{wh.name}</td>
                <td className="p-4 text-[14px] text-gray-600 font-mono text-xs max-w-[200px] truncate">{wh.url}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map((ev) => (
                      <span key={ev} className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded">{ev}</span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    wh.is_active ? "bg-green-500/10 text-green-400" : "bg-gray-200 text-gray-500"
                  }`}>
                    {wh.is_active ? t("active") : t("inactive")}
                  </span>
                </td>
                <td className="p-4 text-xs text-gray-400">
                  {wh.last_triggered_at ? new Date(wh.last_triggered_at).toLocaleString("tr-TR") : "—"}
                </td>
                <td className="p-4 text-[14px]">
                  <span className={wh.failure_count > 0 ? "text-red-400" : "text-gray-400"}>
                    {wh.failure_count}
                  </span>
                </td>
              </tr>
            ))}
            {webhooks.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400 text-[14px]">{t("no_webhooks")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
