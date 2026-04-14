"use client"

import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { useState, useEffect, useCallback, useRef } from "react"
import { useI18n, localePath, type Lang } from "@/lib/i18n"
import { useRouter } from "next/navigation"

declare global {
  interface Window {
    FB: any
    fbAsyncInit: () => void
  }
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || ""
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || ""

interface ConnectionStatus {
  connected: boolean
  waba_id?: string
  waba_name?: string
  business_id?: string
  phone_numbers?: {
    id: string
    number: string
    verified_name: string | null
    quality_rating: string
    status: string
  }[]
}

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url?: string | null
  joined_at?: string
  created_at?: string
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-surface-150 border border-surface-300 flex items-center justify-center text-ink-secondary shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="ds-section-title">{title}</h3>
        {subtitle && <p className="text-caption text-ink-secondary mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-surface-300 last:border-0">
      <span className="text-caption text-ink-secondary w-32 shrink-0">{label}</span>
      <span className={`text-ui text-ink text-right ${mono ? "font-mono text-xs bg-surface-150 px-2 py-0.5 rounded" : ""}`}>
        {value || "—"}
      </span>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700 border border-purple-200",
    admin: "bg-blue-100 text-blue-700 border border-blue-200",
    member: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    viewer: "bg-gray-100 text-gray-600 border border-gray-200",
  }
  const cls = colors[role] || "bg-gray-100 text-gray-600 border border-gray-200"
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {role}
    </span>
  )
}

function MemberAvatar({ name, email, size = "sm" }: { name?: string | null; email: string; size?: "sm" | "md" }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : email.charAt(0).toUpperCase()
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
  return (
    <div className={`${sz} rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0`}>
      <span className="text-primary font-semibold">{initials}</span>
    </div>
  )
}

export default function SettingsPage() {
  const { user, getToken, setAuth } = useAuth()
  const { t, lang, setLang } = useI18n()
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // WhatsApp state
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [waError, setWaError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)

  // Profile state
  const [editName, setEditName] = useState("")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Password state
  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [savingPwd, setSavingPwd] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showCurrentPwd, setShowCurrentPwd] = useState(false)
  const [showNewPwd, setShowNewPwd] = useState(false)

  // Team state
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Init
  useEffect(() => {
    if (user?.full_name) setEditName(user.full_name)
    if (user?.avatar_url) setAvatarPreview(user.avatar_url)
  }, [user])

  // Facebook SDK
  useEffect(() => {
    if (window.FB) { setSdkReady(true); return }
    window.fbAsyncInit = () => {
      window.FB.init({ appId: META_APP_ID, cookie: true, xfbml: true, version: "v21.0" })
      setSdkReady(true)
    }
    const script = document.createElement("script")
    script.src = "https://connect.facebook.net/tr_TR/sdk.js"
    script.async = true
    script.defer = true
    document.body.appendChild(script)
  }, [])

  const checkStatus = useCallback(async () => {
    try {
      const token = getToken()
      if (!token) return
      const data = await api<ConnectionStatus>("/embedded-signup/status", { token })
      setStatus(data)
    } catch { } finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { checkStatus() }, [checkStatus])

  const fetchTeam = useCallback(() => {
    const token = getToken()
    if (!token) return
    api<TeamMember[]>("/crm/team", { token }).then(setMembers).catch(() => {})
    api<Invitation[]>("/crm/team/invitations", { token })
      .then((inv) => setInvitations(inv.filter((i) => i.status === "pending")))
      .catch(() => {})
  }, [getToken])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  // Handlers
  const handleConnect = () => {
    if (!sdkReady || !window.FB) { setWaError("Facebook SDK yuklenemedi."); return }
    setWaError(null)
    setConnecting(true)
    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) sendCodeToBackend(response.authResponse.code)
        else { setConnecting(false); setWaError("Facebook girisi iptal edildi.") }
      },
      { config_id: META_CONFIG_ID, response_type: "code", override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" } }
    )
  }

  const sendCodeToBackend = async (code: string) => {
    try {
      const token = getToken()
      if (!token) return
      await api("/embedded-signup/connect", { token, method: "POST", body: JSON.stringify({ code }) })
      await checkStatus()
      setWaError(null)
    } catch (err: any) {
      setWaError(err.message || "Baglanti hatasi.")
    } finally { setConnecting(false) }
  }

  const handleAvatarClick = () => avatarInputRef.current?.click()

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: "error", text: lang === "tr" ? "Dosya 2MB'den küçük olmalı" : "File must be smaller than 2MB" })
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      setAvatarPreview(result)
      setAvatarBase64(result)
    }
    reader.readAsDataURL(file)
  }

  const handleSaveProfile = async () => {
    const token = getToken()
    if (!token) return
    if (!editName.trim() || editName.trim().length < 2) {
      setProfileMsg({ type: "error", text: lang === "tr" ? "Ad Soyad en az 2 karakter olmalı" : "Name must be at least 2 characters" })
      return
    }
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      const body: Record<string, string> = { full_name: editName.trim() }
      if (avatarBase64) body.avatar_url = avatarBase64
      await api("/auth/update-profile", { token, method: "PATCH", body: JSON.stringify(body) })
      // Refresh user in store
      const fresh = await api("/auth/me", { token })
      const refresh = localStorage.getItem("refresh_token") || ""
      setAuth(fresh, token, refresh)
      setProfileMsg({ type: "success", text: t("profile_updated") })
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || t("error") })
    } finally { setSavingProfile(false) }
  }

  const handleChangePassword = async () => {
    const token = getToken()
    if (!token) return
    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdMsg({ type: "error", text: lang === "tr" ? "Tüm alanları doldurun" : "Fill all fields" })
      return
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg({ type: "error", text: t("passwords_no_match") })
      return
    }
    if (newPwd.length < 6) {
      setPwdMsg({ type: "error", text: t("min_6_chars") })
      return
    }
    setSavingPwd(true)
    setPwdMsg(null)
    try {
      await api("/auth/change-password", { token, method: "POST", body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }) })
      setPwdMsg({ type: "success", text: t("password_changed") })
      setCurrentPwd("")
      setNewPwd("")
      setConfirmPwd("")
    } catch (err: any) {
      const msg = err.message || t("error")
      setPwdMsg({ type: "error", text: msg.includes("yanlis") || msg.includes("incorrect") ? (lang === "tr" ? "Mevcut şifre yanlış" : "Current password is incorrect") : msg })
    } finally { setSavingPwd(false) }
  }

  const handleInvite = async () => {
    const token = getToken()
    if (!token || !inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)
    try {
      await api("/crm/team/invitations", { token, method: "POST", body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }) })
      setInviteMsg({ type: "success", text: lang === "tr" ? "Davet gönderildi" : "Invitation sent" })
      setInviteEmail("")
      setInviteRole("member")
      fetchTeam()
    } catch (err: any) {
      setInviteMsg({ type: "error", text: err.message || t("error") })
    } finally { setInviting(false) }
  }

  const handleCancelInvitation = async (id: string) => {
    const token = getToken()
    if (!token) return
    try {
      await api(`/crm/team/invitations?invitation_id=${id}`, { token, method: "DELETE" })
      fetchTeam()
    } catch { }
  }

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang)
    router.push(localePath("settings", newLang))
  }

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  const roleLabels: Record<string, string> = {
    owner: lang === "tr" ? "Sahip" : "Owner",
    admin: lang === "tr" ? "Yönetici" : "Admin",
    member: lang === "tr" ? "Üye" : "Member",
    viewer: lang === "tr" ? "İzleyici" : "Viewer",
  }

  return (
    <div className="p-7 pb-10">
      <div className="ds-page-header mb-6">
        <h2 className="ds-page-title">{t("settings")}</h2>
        <p className="ds-page-subtitle">{t("organization")} &amp; {t("profile")}</p>
      </div>

      <div className="max-w-5xl space-y-5">

        {/* ═══ ROW 1: Profil + Şifre ═══ */}
        <div className="grid grid-cols-2 gap-5">

          {/* Profil Kartı */}
          <div className="ds-card p-6">
            <SectionHeader
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
              title={t("profile")}
            />

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-primary font-bold text-lg">{initials}</span>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div>
                <p className="text-ui font-semibold text-ink">{user?.full_name}</p>
                <p className="text-caption text-ink-secondary">{user?.email}</p>
                <div className="mt-1">
                  <RoleBadge role={user?.role || "member"} />
                </div>
              </div>
            </div>

            {/* Name input */}
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-caption text-ink-secondary block mb-1.5">{t("full_name")}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="ds-input w-full"
                  placeholder={t("full_name")}
                />
              </div>
              <div>
                <label className="text-caption text-ink-secondary block mb-1.5">{t("email")}</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  readOnly
                  className="ds-input w-full bg-surface-150 text-ink-tertiary cursor-not-allowed"
                />
              </div>
            </div>

            {profileMsg && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-caption ${profileMsg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                {profileMsg.type === "success" ? (
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                )}
                {profileMsg.text}
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="ds-btn-primary w-full disabled:opacity-50"
            >
              {savingProfile ? t("saving") : t("update_profile")}
            </button>
          </div>

          {/* Şifre Kartı */}
          <div className="ds-card p-6">
            <SectionHeader
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              }
              title={t("change_password")}
              subtitle={lang === "tr" ? "Güvenliğiniz için güçlü bir şifre kullanın" : "Use a strong password for your security"}
            />

            <div className="space-y-3 mb-4">
              {/* Current password */}
              <div>
                <label className="text-caption text-ink-secondary block mb-1.5">{t("current_password")}</label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? "text" : "password"}
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    className="ds-input w-full pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary"
                  >
                    {showCurrentPwd ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* New + confirm side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-caption text-ink-secondary block mb-1.5">{t("new_password")}</label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? "text" : "password"}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      className="ds-input w-full pr-10"
                      placeholder="••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink-secondary"
                    >
                      {showNewPwd ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-caption text-ink-secondary block mb-1.5">{t("confirm_password")}</label>
                  <input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    className={`ds-input w-full ${confirmPwd && confirmPwd !== newPwd ? "border-red-300 focus:border-red-400" : ""}`}
                    placeholder="••••••"
                  />
                </div>
              </div>

              {/* Password strength hint */}
              {newPwd.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        newPwd.length < 6 ? (i === 0 ? "bg-red-400" : "bg-surface-300") :
                        newPwd.length < 8 ? (i < 2 ? "bg-amber-400" : "bg-surface-300") :
                        newPwd.length < 12 ? (i < 3 ? "bg-blue-400" : "bg-surface-300") :
                        "bg-green-500"
                      }`}
                    />
                  ))}
                  <span className="text-caption text-ink-tertiary ml-1">
                    {newPwd.length < 6 ? (lang === "tr" ? "Zayıf" : "Weak") :
                     newPwd.length < 8 ? (lang === "tr" ? "Orta" : "Fair") :
                     newPwd.length < 12 ? (lang === "tr" ? "İyi" : "Good") :
                     (lang === "tr" ? "Güçlü" : "Strong")}
                  </span>
                </div>
              )}
            </div>

            {pwdMsg && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-caption ${pwdMsg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                {pwdMsg.type === "success" ? (
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                )}
                {pwdMsg.text}
              </div>
            )}

            <button
              onClick={handleChangePassword}
              disabled={savingPwd}
              className="ds-btn-primary w-full disabled:opacity-50"
            >
              {savingPwd ? t("saving") : t("change_password")}
            </button>

            {/* Permission info */}
            <div className="mt-4 pt-4 border-t border-surface-300">
              <p className="text-caption text-ink-secondary mb-2 font-medium">{t("role")}</p>
              <div className="flex items-center justify-between bg-surface-150 rounded-lg px-3 py-2.5">
                <span className="text-ui text-ink">{roleLabels[user?.role || "member"] || user?.role}</span>
                <RoleBadge role={user?.role || "member"} />
              </div>
              <p className="text-caption text-ink-tertiary mt-2">
                {lang === "tr"
                  ? "Yetki değişikliği için organizasyon yöneticinizle iletişime geçin."
                  : "Contact your organization admin to change your role."}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ ROW 2: Ekip Yönetimi ═══ */}
        <div className="ds-card p-6">
          <SectionHeader
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            }
            title={t("team_management")}
            subtitle={lang === "tr" ? "Ekip üyelerini yönet, yeni üye davet et" : "Manage team members, invite new members"}
          />

          <div className="grid grid-cols-2 gap-6">

            {/* Sol: Üye listesi */}
            <div>
              <p className="text-caption text-ink-secondary font-medium uppercase tracking-wide mb-3">{t("team_members")} ({members.length})</p>
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 bg-surface-150 border border-surface-300 rounded-lg px-3 py-2.5">
                    <MemberAvatar name={m.full_name} email={m.email} />
                    <div className="flex-1 min-w-0">
                      <p className="text-ui font-medium text-ink truncate">{m.full_name || "—"}</p>
                      <p className="text-caption text-ink-secondary truncate">{m.email}</p>
                    </div>
                    <div className="shrink-0">
                      <RoleBadge role={m.role} />
                    </div>
                  </div>
                ))}
                {members.length === 0 && (
                  <div className="text-center py-6 text-ink-tertiary text-caption bg-surface-150 rounded-lg border border-surface-300 border-dashed">
                    {t("no_members")}
                  </div>
                )}
              </div>
            </div>

            {/* Sağ: Davet + Bekleyenler */}
            <div>
              {/* Davet formu */}
              <p className="text-caption text-ink-secondary font-medium uppercase tracking-wide mb-3">
                {lang === "tr" ? "Yeni Üye Davet Et" : "Invite New Member"}
              </p>
              <div className="space-y-2 mb-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={lang === "tr" ? "E-posta adresi" : "Email address"}
                  className="ds-input w-full"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                />
                <div className="flex gap-2">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="ds-select flex-1"
                  >
                    <option value="member">{lang === "tr" ? "Üye" : "Member"}</option>
                    <option value="admin">{lang === "tr" ? "Yönetici" : "Admin"}</option>
                    <option value="viewer">{lang === "tr" ? "İzleyici" : "Viewer"}</option>
                  </select>
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="ds-btn-primary flex-1 disabled:opacity-50"
                  >
                    {inviting ? (
                      <svg className="animate-spin h-4 w-4 mx-auto" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    ) : t("send_invite")}
                  </button>
                </div>
              </div>

              {inviteMsg && (
                <div className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-caption ${inviteMsg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                  {inviteMsg.type === "success" ? (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" /></svg>
                  )}
                  {inviteMsg.text}
                </div>
              )}

              {/* Bekleyen davetler */}
              {invitations.length > 0 && (
                <div className="mt-4">
                  <p className="text-caption text-ink-secondary font-medium uppercase tracking-wide mb-2">
                    {t("pending_invitations")} ({invitations.length})
                  </p>
                  <div className="space-y-2">
                    {invitations.map((inv) => (
                      <div key={inv.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-ui text-ink truncate">{inv.email}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <RoleBadge role={inv.role} />
                            <span className="text-caption text-ink-tertiary">
                              {new Date(inv.created_at).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-US")}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="shrink-0 text-red-500 hover:text-red-700 transition-colors p-1.5 rounded-lg hover:bg-red-50"
                          title={t("cancel_invitation")}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invitations.length === 0 && (
                <div className="mt-4 text-center py-4 text-ink-tertiary text-caption bg-surface-150 rounded-lg border border-surface-300 border-dashed">
                  {t("no_invitations")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ ROW 3: Org + WhatsApp + Dil ═══ */}
        <div className="grid grid-cols-3 gap-5">

          {/* Organizasyon */}
          <div className="ds-card p-5">
            <SectionHeader
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              }
              title={t("organization")}
            />
            <InfoRow label={t("company_name")} value={user?.org_name} />
            <InfoRow label="Slug" value={user?.org_slug} mono />
            <div className="flex items-start justify-between py-2.5">
              <span className="text-caption text-ink-secondary w-32 shrink-0">{t("plan")}</span>
              <span className={`ds-badge ${user?.org_plan === "trial" ? "ds-badge-warning" : "ds-badge-success"}`}>
                {user?.org_plan === "trial" ? t("trial_plan") : user?.org_plan}
              </span>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="ds-card p-5">
            <SectionHeader
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              }
              title={t("whatsapp_connection")}
            />
            {loading ? (
              <div className="flex items-center gap-2 text-ink-secondary text-caption py-2">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                {t("loading")}
              </div>
            ) : status?.connected ? (
              <div>
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-green-700 text-caption font-medium">{t("connected")}</span>
                </div>
                <InfoRow label="WABA" value={status.waba_name} />
              </div>
            ) : (
              <div>
                {waError && <p className="text-red-600 text-caption mb-3">{waError}</p>}
                <button
                  onClick={handleConnect}
                  disabled={connecting || !sdkReady}
                  className="ds-btn-primary w-full disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                >
                  {connecting ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  )}
                  {connecting ? t("connecting") : t("connect_whatsapp")}
                </button>
              </div>
            )}
          </div>

          {/* Dil */}
          <div className="ds-card p-5">
            <SectionHeader
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                </svg>
              }
              title={t("language")}
              subtitle={lang === "tr" ? "Arayüz dili" : "Interface language"}
            />
            <div className="space-y-2">
              {(["tr", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => handleLangChange(l)}
                  className={`w-full flex items-center gap-3 border rounded-xl px-3 py-2.5 transition-all duration-150 ${
                    lang === l
                      ? "border-primary bg-primary-50"
                      : "border-surface-300 bg-white hover:border-primary/30"
                  }`}
                >
                  <span className="text-lg">{l === "tr" ? "🇹🇷" : "🇬🇧"}</span>
                  <span className={`text-ui font-medium ${lang === l ? "text-primary" : "text-ink"}`}>
                    {l === "tr" ? "Türkçe" : "English"}
                  </span>
                  {lang === l && (
                    <svg className="w-4 h-4 text-primary ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
