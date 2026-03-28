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
      <div className="ds-page-header px-7 py-5 border-b border-surface-200">
        <h2 className="ds-page-title">{t("team")}</h2>
        <button
          onClick={() => setShowInviteForm(true)}
          className="ds-btn-primary"
        >
          {t("invite_member")}
        </button>
      </div>

      {/* Invite Modal */}
      {showInviteForm && (
        <div className="ds-modal-overlay" onClick={() => setShowInviteForm(false)}>
          <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ds-modal-title">{t("invite_member")}</h3>
            {formError && <p className="text-red-400 text-caption mb-3">{formError}</p>}
            <div className="space-y-3">
              <div className="ds-form-group">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t("email")}
                  className="ds-input"
                />
              </div>
              <div className="ds-form-group">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="ds-select"
                >
                  <option value="member">{t("member")}</option>
                  <option value="admin">{t("admin")}</option>
                  <option value="viewer">{t("viewer")}</option>
                </select>
              </div>
            </div>
            <div className="ds-modal-actions">
              <button
                onClick={() => setShowInviteForm(false)}
                className="ds-btn-ghost"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleInvite}
                className="ds-btn-primary"
              >
                {t("send_invite")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Members */}
        <div className="p-7">
          <h3 className="ds-section-title mb-3">{t("team_members")}</h3>
          <table className="ds-table w-full">
            <thead>
              <tr className="ds-table-header">
                <th className="text-left p-4">{t("name")}</th>
                <th className="text-left p-4">{t("email")}</th>
                <th className="text-left p-4">{t("role")}</th>
                <th className="text-left p-4">{t("joined_at")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="ds-table-row">
                  <td className="p-4 text-ui text-ink">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-avatar bg-primary flex items-center justify-center text-white text-caption-medium font-bold flex-shrink-0">
                        {(m.full_name || m.email).charAt(0).toUpperCase()}
                      </div>
                      {m.full_name || "\u2014"}
                    </div>
                  </td>
                  <td className="p-4 text-ui text-surface-500">{m.email}</td>
                  <td className="p-4">
                    <span className="ds-badge-primary capitalize">{m.role}</span>
                  </td>
                  <td className="p-4 text-caption text-surface-400">
                    {new Date(m.joined_at).toLocaleDateString("tr-TR")}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-surface-400 text-ui">{t("no_members")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pending Invitations */}
        <div className="p-7 pt-0">
          <h3 className="ds-section-title mb-3">{t("pending_invitations")}</h3>
          <table className="ds-table w-full">
            <thead>
              <tr className="ds-table-header">
                <th className="text-left p-4">{t("email")}</th>
                <th className="text-left p-4">{t("role")}</th>
                <th className="text-left p-4">{t("status")}</th>
                <th className="text-left p-4">{t("sent_at")}</th>
                <th className="text-left p-4">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id} className="ds-table-row">
                  <td className="p-4 text-ui text-ink">{inv.email}</td>
                  <td className="p-4">
                    <span className="ds-badge-primary capitalize">{inv.role}</span>
                  </td>
                  <td className="p-4">
                    <span className="ds-badge-warning capitalize">{inv.status}</span>
                  </td>
                  <td className="p-4 text-caption text-surface-400">
                    {new Date(inv.created_at).toLocaleDateString("tr-TR")}
                  </td>
                  <td className="p-4">
                    {inv.status === "pending" && (
                      <button
                        onClick={() => handleCancelInvitation(inv.id)}
                        className="text-red-400 hover:text-red-300 text-caption-medium font-medium transition"
                      >
                        {t("cancel_invitation")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-surface-400 text-ui">{t("no_invitations")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
