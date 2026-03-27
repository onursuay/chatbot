"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface Contact {
  id: string
  name: string | null
  phone: string
  tags: string[]
  last_message_at: string | null
}

export default function ContactsPage() {
  const { getToken } = useAuth()
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
      <div className="p-6 border-b border-dark-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Kişiler</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ara..."
            className="bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
          />
          <button className="bg-brand-500 hover:bg-brand-600 text-dark-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition">
            + Kişi Ekle
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-800 text-dark-400 text-xs uppercase">
              <th className="text-left p-4">İsim</th>
              <th className="text-left p-4">Telefon</th>
              <th className="text-left p-4">Etiketler</th>
              <th className="text-left p-4">Son Mesaj</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition">
                <td className="p-4 text-[14px] text-white">{c.name || "—"}</td>
                <td className="p-4 text-[14px] text-dark-300">{c.phone}</td>
                <td className="p-4">
                  {c.tags.map((t) => (
                    <span key={t} className="bg-brand-500/10 text-brand-400 text-xs px-2 py-0.5 rounded mr-1">{t}</span>
                  ))}
                </td>
                <td className="p-4 text-xs text-dark-500">
                  {c.last_message_at ? new Date(c.last_message_at).toLocaleDateString("tr-TR") : "—"}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-dark-600 text-[14px]">Henüz kişi yok</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
