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
    <div className="h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{t("contacts")}</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
          />
          <button className="bg-primary hover:bg-primary/90 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition">
            {t("add_contact")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase">
              <th className="text-left p-4">{t("contact_name")}</th>
              <th className="text-left p-4">{t("phone")}</th>
              <th className="text-left p-4">{t("tags")}</th>
              <th className="text-left p-4">{t("last_message")}</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                <td className="p-4 text-[14px] text-gray-900">{c.name || "—"}</td>
                <td className="p-4 text-[14px] text-gray-600">{c.phone}</td>
                <td className="p-4">
                  {c.tags.map((tag) => (
                    <span key={tag} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded mr-1">{tag}</span>
                  ))}
                </td>
                <td className="p-4 text-xs text-gray-400">
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString("tr-TR") : "—"}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-400 text-[14px]">{t("no_contacts")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
