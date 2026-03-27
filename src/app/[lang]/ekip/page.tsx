"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
  joined_at: string
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
}

export default function EkipPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)

  // Invite form fields
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [formError, setFormError] = useState("")

  const fetchData = () => {
    const token = getToken()
    if (!token) return
    api<TeamMember[]>("/crm/team/members", { token }).then(setMembers).catch(() => {})
    api<Invitation[]>("/crm/team/invitations", { token }).then(setInvitations).catch(() => {})
  }

  useEffect(() => {
    fetchData()
  }, [getToken])

  const handleInvite = async () => {
    const token = getToken()
    if (!token) return
    setFormError("")

    try {
      await api("/crm/team/invitations", {
        token,
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      setShowInviteForm(false)
      setInviteEmail("")
      setInviteRole("member")
      fetchData()
    } catch (err: any) {
      setFormError(err.message || t("error"))
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    const token = getToken()
    if (!token) return

    try {
      await api(`/crm/team/invitations/${invitationId}`, {
        token,
        method: "DELETE",
      })
      fetchData()
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-6 border-b border-dark-800 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">{t("team")}</h2>
        <button
          onClick={() => setShowInviteForm(true)}
          className="bg-brand-500 hover:bg-brand-600 text-dark-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          {t("invite_member")}
        </button>
      </div>

      {/* Invite Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowInviteForm(false)}>
          <div className="bg-dark-900 rounded-lg border border-dark-800 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold text-lg mb-4">{t("invite_member")}</h3>
            {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}
            <div className="space-y-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t("email")}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="member">{t("member")}</option>
                <option value="admin">{t("admin")}</option>
                <option value="viewer">{t("viewer")}</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-dark-400 hover:text-white text-sm px-4 py-2.5 transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleInvite}
                className="bg-brand-500 hover:bg-brand-600 text-dark-950 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
              >
                {t("send_invite")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Members */}
        <div className="p-6">
          <h3 className="text-white font-semibold text-sm mb-3">{t("team_members")}</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-800 text-dark-400 text-xs uppercase">
                <th className="text-left p-4">{t("name")}</th>
                <th className="text-left p-4">{t("email")}</th>
                <th className="text-left p-4">{t("role")}</th>
                <th className="text-left p-4">{t("joined_at")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition">
                  <td className="p-4 text-[14px] text-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
                        {(m.full_name || m.email).charAt(0).toUpperCase()}
                      </div>
                      {m.full_name || "—"}
                    </div>
                  </td>
                  <td className="p-4 text-[14px] text-dark-300">{m.email}</td>
                  <td className="p-4">
                    <span className="bg-brand-500/10 text-brand-400 text-xs px-2 py-0.5 rounded capitalize">{m.role}</span>
                  </td>
                  <td className="p-4 text-xs text-dark-500">
                    {new Date(m.joined_at).toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-dark-600 text-[14px]">{t("no_members")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pending Invitations */}
        <div className="p-6 pt-0">
          <h3 className="text-white font-semibold text-sm mb-3">{t("pending_invitations")}</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-800 text-dark-400 text-xs uppercase">
                <th className="text-left p-4">{t("email")}</th>
                <th className="text-left p-4">{t("role")}</th>
                <th className="text-left p-4">{t("status")}</th>
                <th className="text-left p-4">{t("sent_at")}</th>
                <th className="text-left p-4">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition">
                  <td className="p-4 text-[14px] text-white">{inv.email}</td>
                  <td className="p-4">
                    <span className="bg-brand-500/10 text-brand-400 text-xs px-2 py-0.5 rounded capitalize">{inv.role}</span>
                  </td>
                  <td className="p-4">
                    <span className="bg-yellow-500/10 text-yellow-400 text-xs px-2 py-0.5 rounded capitalize">{inv.status}</span>
                  </td>
                  <td className="p-4 text-xs text-dark-500">
                    {new Date(inv.created_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="p-4">
                    {inv.status === "pending" && (
                      <button
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-medium transition"
                      >
                        {t("cancel_invitation")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-dark-600 text-[14px]">{t("no_invitations")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
