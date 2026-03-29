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

  // Add Contact modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newPhone, setNewPhone] = useState("")
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [formError, setFormError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadContacts = () => {
    const token = getToken()
    if (!token) return
    const q = search ? `?search=${search}` : ""
    api<Contact[]>(`/contacts${q}`, { token }).then(setContacts).catch(() => {})
  }

  useEffect(() => {
    loadContacts()
  }, [getToken, search])

  const handleAddContact = async () => {
    const token = getToken()
    if (!token) return

    if (!newPhone.trim()) {
      setFormError(t("phone_required") || "Telefon numarası zorunlu")
      return
    }

    setSubmitting(true)
    setFormError("")

    try {
      await api("/contacts", {
        token,
        method: "POST",
        body: JSON.stringify({
          phone: newPhone.trim(),
          name: newName.trim() || null,
          email: newEmail.trim() || null,
          tags: [],
        }),
      })
      setShowAddModal(false)
      setNewPhone("")
      setNewName("")
      setNewEmail("")
      loadContacts()
    } catch (err: any) {
      setFormError(err.message || "Bir hata oluştu")
    } finally {
      setSubmitting(false)
    }
  }

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
          <button className="ds-btn-primary" onClick={() => setShowAddModal(true)}>
            {t("add_contact")}
          </button>
        </div>
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="ds-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ds-modal-title">{t("add_contact")}</h3>
            {formError && <p className="text-red-700 text-caption mb-3">{formError}</p>}
            <div className="space-y-3">
              <div className="ds-form-group">
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder={t("phone") || "Telefon"}
                  className="ds-input"
                />
              </div>
              <div className="ds-form-group">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("contact_name") || "İsim"}
                  className="ds-input"
                />
              </div>
              <div className="ds-form-group">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder={t("email") || "E-posta"}
                  className="ds-input"
                />
              </div>
            </div>
            <div className="ds-modal-actions">
              <button
                onClick={() => setShowAddModal(false)}
                className="ds-btn-ghost"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleAddContact}
                disabled={submitting}
                className="ds-btn-primary"
              >
                {submitting ? (t("saving") || "Kaydediliyor...") : (t("save") || "Kaydet")}
              </button>
            </div>
          </div>
        </div>
      )}

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
