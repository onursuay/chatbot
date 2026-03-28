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
      <div className="ds-page-header px-7 py-5 border-b border-surface-200">
        <h2 className="ds-page-title">{t("webhooks")}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="ds-btn-primary"
        >
          {t("create_webhook")}
        </button>
      </div>

      {/* Create Webhook Modal */}
      {showForm && (
        <div className="ds-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ds-modal-title">{t("create_webhook")}</h3>
            {formError && <p className="text-red-400 text-caption mb-3">{formError}</p>}
            <div className="space-y-3">
              <div className="ds-form-group">
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("webhook_name")}
                  className="ds-input"
                />
              </div>
              <div className="ds-form-group">
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder={t("webhook_url")}
                  className="ds-input"
                />
              </div>
              <div className="ds-form-group">
                <label className="ds-form-label">{t("events")}</label>
                <div className="flex flex-wrap gap-2">
                  {eventOptions.map((event) => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => handleToggleEvent(event)}
                      className={formEvents.includes(event) ? "ds-chip-active" : "ds-chip"}
                    >
                      {event}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="ds-modal-actions">
              <button
                onClick={() => setShowForm(false)}
                className="ds-btn-ghost"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                className="ds-btn-primary"
              >
                {t("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <table className="ds-table w-full">
          <thead>
            <tr className="ds-table-header">
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
              <tr key={wh.id} className="ds-table-row">
                <td className="p-4 text-ui text-ink font-medium">{wh.name}</td>
                <td className="p-4 text-ui text-surface-500 font-mono text-caption max-w-[200px] truncate">{wh.url}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map((ev) => (
                      <span key={ev} className="ds-badge-primary">{ev}</span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <span className={`${
                    wh.is_active ? "ds-badge-success" : "ds-badge-neutral"
                  }`}>
                    {wh.is_active ? t("active") : t("inactive")}
                  </span>
                </td>
                <td className="p-4 text-caption text-surface-400">
                  {wh.last_triggered_at ? new Date(wh.last_triggered_at).toLocaleString("tr-TR") : "\u2014"}
                </td>
                <td className="p-4 text-ui">
                  <span className={wh.failure_count > 0 ? "text-red-400" : "text-surface-400"}>
                    {wh.failure_count}
                  </span>
                </td>
              </tr>
            ))}
            {webhooks.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-surface-400 text-ui">{t("no_webhooks")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
