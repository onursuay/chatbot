"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface Contact {
  id: string
  name: string | null
  phone: string
  tags: string[]
  last_message_at: string | null
}

export default function ContactsPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    const token = getToken()
    if (!token) return
    const q = search ? `?search=${search}` : ""
    api<Contact[]>(`/contacts${q}`, { token }).then(setContacts).catch(() => {})
  }, [getToken, search])

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("contacts")}</h2>
        </div>
        <div className="flex gap-2.5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="ds-input w-56"
          />
          <button className="ds-btn-primary">
            {t("add_contact")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-300">
              <th className="ds-table-header text-left px-6 py-3">{t("contact_name")}</th>
              <th className="ds-table-header text-left px-6 py-3">{t("phone")}</th>
              <th className="ds-table-header text-left px-6 py-3">{t("tags")}</th>
              <th className="ds-table-header text-left px-6 py-3">{t("last_message")}</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="ds-table-row">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-avatar bg-primary flex items-center justify-center text-white text-micro font-bold">
                      {c.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <span className="text-body-medium text-ink">{c.name || "\u2014"}</span>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-ui text-ink-secondary">{c.phone}</td>
                <td className="px-6 py-3.5">
                  <div className="flex gap-1 flex-wrap">
                    {c.tags.map((tag) => (
                      <span key={tag} className="ds-badge-primary">{tag}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-3.5 text-caption text-ink-tertiary">
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString("tr-TR") : "\u2014"}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="ds-empty-state">
                    <div className="ds-empty-state-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-ink-tertiary">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                      </svg>
                    </div>
                    <p className="ds-empty-state-title">{t("no_contacts")}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
