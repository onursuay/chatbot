"use client"

import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

/* ─── Types ─── */

interface MetaStatus {
  connected: boolean
  status: string | null
  expires_at: string | null
  scopes: string[]
  updated_at?: string
}

interface WhatsAppAccount {
  business_id: string
  business_name: string
  waba_id: string
  waba_name: string
  phone_numbers: {
    id: string
    display_phone_number: string
    verified_name: string
    quality_rating: string
  }[]
}

interface InstagramAccount {
  id: string
  name: string
  username: string
  profile_picture_url?: string
  page_id: string
  page_name: string
  page_access_token?: string
}

interface PageAccount {
  id: string
  name: string
  access_token: string
}

interface ChannelSelection {
  id?: string
  org_id: string
  channel: string
  platform_id: string
  platform_name: string | null
  platform_detail: string | null
  metadata: Record<string, any>
  enabled: boolean
}

interface AvailableResponse {
  whatsapp: WhatsAppAccount[]
  instagram: InstagramAccount[]
  pages: PageAccount[]
  selections: ChannelSelection[]
  activeSelections: {
    whatsapp?: ChannelSelection[]
    instagram?: ChannelSelection[]
    messenger?: ChannelSelection[]
  }
  connected: boolean
  error?: string
}

/* ─── SVG Icons ─── */

function WhatsAppIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2" />
      <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2" />
      <circle cx="18" cy="6" r="1.5" fill="white" />
    </svg>
  )
}

function MessengerIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.434 5.503 3.678 7.2V22l3.378-1.855c.9.25 1.855.384 2.944.384 5.523 0 10-4.144 10-9.243C22 6.145 17.523 2 12 2z" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
      <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SpinnerIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
    </svg>
  )
}

/* ─── Toggle Switch ─── */

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
        checked ? "bg-emerald-500" : "bg-surface-300"
      }`}
    >
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

/* ─── Toast ─── */

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-top-2 ${
      type === "success"
        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
        : "bg-red-50 border-red-200 text-red-800"
    }`}>
      {type === "success" ? (
        <CheckCircleIcon />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
          <path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {message}
      <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100">&times;</button>
    </div>
  )
}

/* ─── Selection Modal ─── */

type ChannelOption = { id: string; label: string; detail: string; [key: string]: any }

function SelectionModal({
  channel,
  channelName,
  options,
  activeAccounts,
  saving,
  onSelect,
  onClose,
  isTR,
}: {
  channel: string
  channelName: string
  options: ChannelOption[]
  activeAccounts: ChannelSelection[]
  saving: boolean
  onSelect: (opt: ChannelOption) => void
  onClose: () => void
  isTR: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-surface-200 w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-surface-200">
          <h3 className="font-bold text-body text-ink">
            {isTR ? `${channelName} Hesap Ekle` : `Add ${channelName} Account`}
          </h3>
          <p className="text-xs text-ink-tertiary mt-1">
            {activeAccounts.length > 0
              ? (isTR ? "Yeni bir hesap daha ekleyin veya zaten ekli olanları görün" : "Add another account or see already added ones")
              : (isTR ? "Bu kanal için bir hesap seçin" : "Select an account for this channel")}
          </p>
        </div>

        {/* Account list */}
        <div className="max-h-72 overflow-y-auto">
          {options.map((opt) => {
            const isCurrentlyActive = activeAccounts.some(a => a.platform_id === opt.id)
            return (
              <button
                key={opt.id}
                disabled={saving || isCurrentlyActive}
                onClick={() => !isCurrentlyActive && onSelect(opt)}
                className={`w-full text-left px-6 py-3.5 transition-colors border-b border-surface-100 last:border-b-0 ${
                  isCurrentlyActive
                    ? "bg-emerald-50/60 cursor-default"
                    : "hover:bg-surface-50 cursor-pointer"
                } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{opt.label}</div>
                    <div className="text-xs text-ink/40 font-mono mt-0.5 truncate">{opt.detail}</div>
                  </div>
                  {isCurrentlyActive && (
                    <div className="flex items-center gap-1.5 text-emerald-600 flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="text-xs font-bold">{isTR ? "Aktif" : "Active"}</span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-200 flex items-center justify-between">
          {saving && (
            <div className="flex items-center gap-2 text-xs text-ink-tertiary">
              <SpinnerIcon className="w-4 h-4" />
              {isTR ? "Kaydediliyor..." : "Saving..."}
            </div>
          )}
          {!saving && <div />}
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink bg-surface-50 hover:bg-surface-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {isTR ? "İptal" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   CHANNELS PAGE — Kanal Yönetimi (Single-Active-Per-Channel)
   ════════════════════════════════════════════ */

export default function ChannelsPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()

  const isTR = t("loading") === "Yükleniyor..."

  // States
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null)
  const [available, setAvailable] = useState<AvailableResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnectingMeta, setDisconnectingMeta] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [selectingChannel, setSelectingChannel] = useState<string | null>(null) // which channel's modal is open
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setToast({ message, type })
  }, [])

  // Fetch meta connection status
  const fetchMetaStatus = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const data = await api<MetaStatus>("/meta/status", { token })
      setMetaStatus(data)
      return data
    } catch {
      setMetaStatus({ connected: false, status: null, expires_at: null, scopes: [] })
    }
  }, [getToken])

  // Fetch available channels + active selections
  const fetchAvailable = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const data = await api<AvailableResponse>("/channels/available", { token })
      setAvailable(data)
    } catch {
      // Not connected or error
    }
  }, [getToken])

  // Initial load
  useEffect(() => {
    const init = async () => {
      const status = await fetchMetaStatus()
      if (status?.connected) {
        await fetchAvailable()
      }
      setLoading(false)
    }
    init()
  }, [fetchMetaStatus, fetchAvailable])

  // Check URL for ?connected=true (OAuth callback redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("connected") === "true") {
      showToast(isTR ? "Meta hesabı başarıyla bağlandı!" : "Meta account connected successfully!")
      window.history.replaceState({}, "", window.location.pathname)
      fetchMetaStatus().then((status) => {
        if (status?.connected) fetchAvailable()
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Connect to Meta via OAuth
  const handleConnect = async () => {
    const token = getToken()
    if (!token) return
    setConnecting(true)
    try {
      const data = await api<{ url: string }>(`/meta/connect?lang=${isTR ? "tr" : "en"}`, { token })
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      showToast(err.message || (isTR ? "Bağlantı hatası" : "Connection error"), "error")
      setConnecting(false)
    }
  }

  // Fully disconnect Meta root account
  const handleDisconnectMeta = async () => {
    const token = getToken()
    if (!token) return
    setDisconnectingMeta(true)
    try {
      await api("/meta/disconnect", { method: "POST", token })
      setMetaStatus({ connected: false, status: null, expires_at: null, scopes: [] })
      setAvailable(null)

      showToast(isTR ? "Meta hesabı kaldırıldı" : "Meta account disconnected")
    } catch (err: any) {
      showToast(err.message || (isTR ? "Bağlantı kesilemedi" : "Disconnect failed"), "error")
    } finally {
      setDisconnectingMeta(false)
    }
  }

  // Select an account for a channel (replaces any existing active account)
  const handleSelect = async (
    channel: string,
    platformId: string,
    platformName: string,
    platformDetail: string,
    metadata: Record<string, any>
  ) => {
    const token = getToken()
    if (!token) return
    setSavingId(platformId)
    try {
      await api("/channels/select", {
        method: "POST",
        token,
        body: JSON.stringify({
          channel,
          platform_id: platformId,
          platform_name: platformName,
          platform_detail: platformDetail,
          metadata,
          enabled: true,
        }),
      })
      await fetchAvailable()
      showToast(isTR ? `${channelLabel(channel)} hesabı seçildi` : `${channelLabel(channel)} account selected`)
    } catch (err: any) {
      showToast(err.message || (isTR ? "Kayıt hatası" : "Save error"), "error")
    } finally {
      setSavingId(null)
      setSelectingChannel(null)
    }
  }

  // Disconnect (disable) a specific account
  const handleDisconnect = async (selection: ChannelSelection) => {
    const token = getToken()
    if (!token) return
    setSavingId(selection.platform_id)
    try {
      await api("/channels/select", {
        method: "POST",
        token,
        body: JSON.stringify({
          channel: selection.channel,
          platform_id: selection.platform_id,
          platform_name: selection.platform_name || "",
          platform_detail: selection.platform_detail || "",
          metadata: selection.metadata || {},
          enabled: false,
        }),
      })
      await fetchAvailable()
      showToast(isTR ? "Hesap bağlantısı kesildi" : "Account disconnected")
    } catch (err: any) {
      showToast(err.message || (isTR ? "Hata oluştu" : "Error occurred"), "error")
    } finally {
      setSavingId(null)
    }
  }

  function channelLabel(ch: string) {
    if (ch === "whatsapp") return "WhatsApp"
    if (ch === "instagram") return "Instagram"
    if (ch === "messenger") return "Messenger"
    if (ch === "telegram") return "Telegram"
    if (ch === "whatsapp_personal") return isTR ? "WhatsApp Kişisel" : "WhatsApp Personal"
    return ch
  }

  // ── Telegram state ──────────────────────────────────────────────────────
  const [tgToken, setTgToken] = useState("")
  const [tgSaving, setTgSaving] = useState(false)
  const [tgDisconnecting, setTgDisconnecting] = useState(false)
  const [tgConnected, setTgConnected] = useState(false)
  const [tgBotName, setTgBotName] = useState<string | null>(null)
  const [tgBotUser, setTgBotUser] = useState<string | null>(null)

  // ── Baileys (WA Kişisel) state ──────────────────────────────────────────
  const [bUrl, setBUrl] = useState("")
  const [bSecret, setBSecret] = useState("")
  const [bSaving, setBSaving] = useState(false)
  const [bDisconnecting, setBDisconnecting] = useState(false)
  const [bConnected, setBConnected] = useState(false)
  const [bPhone, setBPhone] = useState<string | null>(null)

  // Fetch Telegram + Baileys status on mount
  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<{ connected: boolean; bot_username: string | null; bot_name: string | null }>("/channels/telegram", { token })
      .then(d => { setTgConnected(d.connected); setTgBotName(d.bot_name); setTgBotUser(d.bot_username) })
      .catch(() => {})
    api<{ connected: boolean; phone: string | null }>("/channels/baileys", { token })
      .then(d => { setBConnected(d.connected); setBPhone(d.phone) })
      .catch(() => {})
  }, [getToken])

  const handleTelegramConnect = async () => {
    const token = getToken()
    if (!token || !tgToken.trim()) return
    setTgSaving(true)
    try {
      const d = await api<{ ok: boolean; bot_username: string; bot_name: string }>("/channels/telegram", {
        method: "POST", token, body: JSON.stringify({ bot_token: tgToken.trim() }),
      })
      setTgConnected(true)
      setTgBotName(d.bot_name)
      setTgBotUser(d.bot_username)
      setTgToken("")
      showToast(isTR ? "Telegram bağlandı!" : "Telegram connected!")
    } catch (err: any) {
      showToast(err.message || (isTR ? "Bağlantı hatası" : "Connection error"), "error")
    } finally {
      setTgSaving(false)
    }
  }

  const handleTelegramDisconnect = async () => {
    const token = getToken()
    if (!token) return
    setTgDisconnecting(true)
    try {
      await api("/channels/telegram", { method: "DELETE", token })
      setTgConnected(false); setTgBotName(null); setTgBotUser(null)
      showToast(isTR ? "Telegram bağlantısı kesildi" : "Telegram disconnected")
    } catch (err: any) {
      showToast(err.message || (isTR ? "Hata" : "Error"), "error")
    } finally {
      setTgDisconnecting(false)
    }
  }

  const handleBaileysConnect = async () => {
    const token = getToken()
    if (!token || !bUrl.trim() || !bSecret.trim()) return
    setBSaving(true)
    try {
      const d = await api<{ ok: boolean; phone: string | null }>("/channels/baileys", {
        method: "POST", token, body: JSON.stringify({ service_url: bUrl.trim(), secret: bSecret.trim() }),
      })
      setBConnected(true); setBPhone(d.phone)
      setBUrl(""); setBSecret("")
      showToast(isTR ? "WhatsApp Kişisel bağlandı!" : "WhatsApp Personal connected!")
    } catch (err: any) {
      showToast(err.message || (isTR ? "Bağlantı hatası" : "Connection error"), "error")
    } finally {
      setBSaving(false)
    }
  }

  const handleBaileysDisconnect = async () => {
    const token = getToken()
    if (!token) return
    setBDisconnecting(true)
    try {
      await api("/channels/baileys", { method: "DELETE", token })
      setBConnected(false); setBPhone(null)
      showToast(isTR ? "WA Kişisel bağlantısı kesildi" : "WA Personal disconnected")
    } catch (err: any) {
      showToast(err.message || (isTR ? "Hata" : "Error"), "error")
    } finally {
      setBDisconnecting(false)
    }
  }

  // Build flat option lists
  const whatsappOptions: ChannelOption[] = []
  for (const waba of available?.whatsapp || []) {
    for (const phone of waba.phone_numbers || []) {
      whatsappOptions.push({
        id: phone.id,
        label: phone.verified_name || waba.waba_name,
        detail: phone.display_phone_number,
        wabaId: waba.waba_id,
        wabaName: waba.waba_name,
        qualityRating: phone.quality_rating,
      })
    }
  }

  const instagramOptions: ChannelOption[] = (available?.instagram || []).map((ig: any) => ({
    id: ig.id,
    label: ig.name || ig.username,
    detail: ig.username ? `@${ig.username}` : ig.id,
    pageId: ig.page_id,
    pageName: ig.page_name,
    pageAccessToken: ig.page_access_token,
  }))

  const pageOptions: ChannelOption[] = (available?.pages || []).map((p) => ({
    id: p.id,
    label: p.name,
    detail: p.id,
    accessToken: p.access_token,
  }))

  // Get quality rating for a WhatsApp phone number
  const getQualityRating = (platformId: string) => {
    for (const waba of available?.whatsapp || []) {
      for (const p of waba.phone_numbers) {
        if (p.id === platformId) return p.quality_rating
      }
    }
    return null
  }

  const qualityLabel = (rating: string) => {
    if (rating === "GREEN") return isTR ? "Yüksek" : "High"
    if (rating === "YELLOW") return isTR ? "Orta" : "Medium"
    if (rating === "RED") return isTR ? "Düşük" : "Low"
    return isTR ? "Bilinmiyor" : "Unknown"
  }

  const qualityColor = (rating: string) => {
    if (rating === "GREEN") return "text-emerald-600"
    if (rating === "YELLOW") return "text-amber-600"
    if (rating === "RED") return "text-red-600"
    return "text-ink-tertiary"
  }

  const qualityDot = (rating: string) => {
    if (rating === "GREEN") return "bg-emerald-500"
    if (rating === "YELLOW") return "bg-amber-500"
    if (rating === "RED") return "bg-red-500"
    return "bg-surface-350"
  }

  // Format expiry date
  const formatExpiry = (dateStr: string | null) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return isTR ? "Süresi dolmuş" : "Expired"
    if (diffDays === 1) return isTR ? "1 gün kaldı" : "1 day left"
    return isTR ? `${diffDays} gün kaldı` : `${diffDays} days left`
  }

  // Loading state
  if (loading) {
    return <div className="p-7 text-ink-tertiary text-caption">{t("loading")}</div>
  }

  const isConnected = metaStatus?.connected === true

  // Channel card config
  const channelCards: {
    channel: "whatsapp" | "instagram" | "messenger"
    name: string
    subtitle: string
    icon: React.ReactNode
    iconBg: string
    options: ChannelOption[]
    buildPayload: (opt: ChannelOption) => {
      platformName: string
      platformDetail: string
      metadata: Record<string, any>
    }
  }[] = [
    {
      channel: "whatsapp",
      name: "WhatsApp",
      subtitle: "WhatsApp Business API",
      icon: <WhatsAppIcon />,
      iconBg: "bg-[#25D366]",
      options: whatsappOptions,
      buildPayload: (opt) => ({
        platformName: opt.label,
        platformDetail: opt.detail,
        metadata: { waba_id: opt.wabaId, waba_name: opt.wabaName },
      }),
    },
    {
      channel: "instagram",
      name: "Instagram",
      subtitle: "Instagram Direct Messages",
      icon: <InstagramIcon />,
      iconBg: "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]",
      options: instagramOptions,
      buildPayload: (opt) => ({
        platformName: opt.label,
        platformDetail: opt.detail,
        metadata: { page_id: opt.pageId, page_name: opt.pageName, page_access_token: opt.pageAccessToken },
      }),
    },
    {
      channel: "messenger",
      name: "Messenger",
      subtitle: "Facebook Messenger",
      icon: <MessengerIcon />,
      iconBg: "bg-[#0084FF]",
      options: pageOptions,
      buildPayload: (opt) => ({
        platformName: opt.label,
        platformDetail: opt.detail,
        metadata: { page_id: opt.id, page_access_token: opt.accessToken },
      }),
    },
  ]

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Selection Modal */}
      {selectingChannel && (() => {
        const card = channelCards.find((c) => c.channel === selectingChannel)
        if (!card) return null
        const activeAccounts = available?.activeSelections?.[card.channel as keyof typeof available.activeSelections] || []
        return (
          <SelectionModal
            channel={card.channel}
            channelName={card.name}
            options={card.options}
            activeAccounts={activeAccounts}
            saving={savingId !== null}
            onSelect={(opt) => {
              const payload = card.buildPayload(opt)
              handleSelect(card.channel, opt.id, payload.platformName, payload.platformDetail, payload.metadata)
            }}
            onClose={() => savingId === null && setSelectingChannel(null)}
            isTR={isTR}
          />
        )
      })()}

      {/* Page Header */}
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{isTR ? "Kanal Yönetimi" : "Channel Management"}</h2>
          <p className="ds-page-subtitle">
            {isTR
              ? "Meta hesabinizi baglayarak WhatsApp, Instagram ve Messenger kanallarini tek yerden yonetin"
              : "Connect your Meta account to manage WhatsApp, Instagram and Messenger from one place"}
          </p>
        </div>
      </div>

      <div className="p-7 space-y-6">
        {/* ─── Meta Connection Toggle Card ─── */}
        <div className="ds-card p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${isConnected ? "bg-emerald-100" : "bg-surface-100"}`}>
                {isConnected ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 text-emerald-600">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-ink-tertiary">
                    <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-body text-ink">Meta {isTR ? "Hesabı" : "Account"}</h3>
                  {isConnected && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                      {isTR ? "Bağlı" : "Connected"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-tertiary mt-0.5">
                  {isConnected ? (
                    <>
                      {metaStatus?.expires_at && formatExpiry(metaStatus.expires_at)}
                      {metaStatus?.scopes && metaStatus.scopes.length > 0 && (
                        <span className="ml-1.5 opacity-70">
                          · {metaStatus.scopes.length} {isTR ? "izin" : "permission"}{metaStatus.scopes.length > 1 && !isTR ? "s" : ""}
                        </span>
                      )}
                    </>
                  ) : (
                    isTR
                      ? "WhatsApp, Instagram ve Messenger için bağlayın"
                      : "Connect for WhatsApp, Instagram and Messenger"
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isConnected && (
                <button
                  onClick={handleConnect}
                  disabled={connecting || disconnectingMeta}
                  className="text-xs font-medium text-ink-tertiary hover:text-ink underline underline-offset-2 transition-colors disabled:opacity-40"
                >
                  {connecting
                    ? (isTR ? "Yönlendiriliyor..." : "Redirecting...")
                    : (isTR ? "Yeniden Bağla" : "Reconnect")}
                </button>
              )}
              {(connecting || disconnectingMeta) && <SpinnerIcon className="w-4 h-4 text-ink-tertiary" />}
              <ToggleSwitch
                checked={isConnected}
                onChange={() => {
                  if (isConnected) {
                    handleDisconnectMeta()
                  } else {
                    handleConnect()
                  }
                }}
                disabled={connecting || disconnectingMeta}
              />
            </div>
          </div>

          {/* ─── Connected Facebook Page ─── */}
          {isConnected && (() => {
            const connectedPage = { name: "Ustasını Yolla", id: "485310411915762" }
            return (
              <div className="mt-3 pt-3 border-t border-surface-200 flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-600">
                    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wide leading-none mb-0.5">
                    {isTR ? "Bağlı Facebook Sayfası" : "Connected Facebook Page"}
                  </p>
                  <p className="text-xs font-medium text-ink leading-none">{connectedPage.name}</p>
                  <p className="text-[10px] text-ink-tertiary mt-0.5">Page ID: {connectedPage.id}</p>
                </div>
              </div>
            )
          })()}

        </div>

        {/* ─── Channel Cards Grid ─── */}
        {isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {channelCards.map((card) => {
              const activeAccounts = available?.activeSelections?.[card.channel as keyof typeof available.activeSelections] || []
              const hasOptions = card.options.length > 0

              return (
                <div
                  key={card.channel}
                  className={`bg-white rounded-xl border transition-all duration-200 ${
                    activeAccounts.length > 0 ? "border-surface-300 shadow-card" : "border-surface-300 border-dashed"
                  }`}
                >
                  {/* Card Header: Icon + Name */}
                  <div className="p-5 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
                        {card.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-body text-ink">{card.name}</h3>
                        <p className="text-[11px] text-ink-tertiary">{card.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* ─── Card Body: State-based content ─── */}
                  <div className="px-5 pb-5">

                    {/* No available accounts for this channel */}
                    {!hasOptions && (
                      <div className="py-6 px-3 rounded-lg bg-surface-50 border border-dashed border-surface-300 text-center">
                        <p className="text-sm text-ink-tertiary font-medium">
                          {isTR ? "Kullanılabilir hesap yok" : "No accounts available"}
                        </p>
                      </div>
                    )}

                    {/* No active accounts yet */}
                    {hasOptions && activeAccounts.length === 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="w-2.5 h-2.5 rounded-full bg-surface-350" />
                          <span className="text-sm text-ink-tertiary font-medium">
                            {isTR ? "Hesap seçilmemiş" : "No account selected"}
                          </span>
                        </div>
                        <button
                          onClick={() => setSelectingChannel(card.channel)}
                          disabled={savingId !== null}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {isTR ? "Hesap Seç" : "Select Account"}
                        </button>
                      </div>
                    )}

                    {/* One or more active accounts */}
                    {hasOptions && activeAccounts.length > 0 && (
                      <div>
                        {/* Active status badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-sm font-bold text-emerald-600">
                            {activeAccounts.length} {isTR ? "Aktif Hesap" : "Active Account(s)"}
                          </span>
                        </div>

                        {/* List each active account */}
                        <div className="space-y-2 mb-4">
                          {activeAccounts.map((acct) => {
                            const quality = card.channel === "whatsapp" ? getQualityRating(acct.platform_id) : null
                            return (
                              <div key={acct.platform_id} className="rounded-lg bg-surface-50 border border-surface-200 p-3.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-semibold text-ink truncate">
                                      {acct.platform_name || "-"}
                                    </div>
                                    {acct.platform_detail && (
                                      <div className="text-xs text-ink/50 font-mono mt-1 truncate">
                                        {acct.platform_detail}
                                      </div>
                                    )}
                                    {quality && (
                                      <div className="flex items-center gap-1.5 mt-2 text-xs">
                                        <span className="text-ink-tertiary">{isTR ? "Kalite:" : "Quality:"}</span>
                                        <span className={`w-2 h-2 rounded-full ${qualityDot(quality)}`} />
                                        <span className={`font-semibold ${qualityColor(quality)}`}>
                                          {qualityLabel(quality)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDisconnect(acct)}
                                    disabled={savingId === acct.platform_id}
                                    className="text-xs font-bold text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors disabled:opacity-50 flex-shrink-0"
                                  >
                                    {savingId === acct.platform_id ? <SpinnerIcon className="w-3.5 h-3.5" /> : (isTR ? "Kaldır" : "Remove")}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Add more accounts button */}
                        <button
                          onClick={() => setSelectingChannel(card.channel)}
                          disabled={savingId !== null}
                          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {isTR ? "Hesap Ekle" : "Add Account"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Telegram + WA Kişisel Kartları ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Telegram Kartı */}
          <div className="bg-white rounded-xl border border-surface-300 shadow-card">
            <div className="p-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#229ED9] rounded-xl flex items-center justify-center shadow-md">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                    <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-body text-ink">Telegram</h3>
                    {tgConnected && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                        {isTR ? "Bağlı" : "Connected"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-tertiary">Telegram Bot API</p>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5">
              {tgConnected ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm text-ink font-semibold">@{tgBotUser || "bot"}</span>
                    {tgBotName && <span className="text-xs text-ink-tertiary">· {tgBotName}</span>}
                  </div>
                  <button
                    onClick={handleTelegramDisconnect}
                    disabled={tgDisconnecting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {tgDisconnecting ? <SpinnerIcon className="w-4 h-4" /> : null}
                    {isTR ? "Bağlantıyı Kes" : "Disconnect"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-ink-tertiary">
                    {isTR
                      ? "Telegram'da @BotFather'a yaz → /newbot → token'ı kopyala"
                      : "Message @BotFather on Telegram → /newbot → copy the token"}
                  </p>
                  <input
                    type="text"
                    value={tgToken}
                    onChange={e => setTgToken(e.target.value)}
                    placeholder="123456:ABCdef..."
                    className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:border-primary bg-surface-50 font-mono"
                  />
                  <button
                    onClick={handleTelegramConnect}
                    disabled={tgSaving || !tgToken.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-[#229ED9] rounded-lg hover:bg-[#1a8dc4] transition-colors disabled:opacity-50"
                  >
                    {tgSaving ? <SpinnerIcon className="w-4 h-4" /> : null}
                    {tgSaving ? (isTR ? "Bağlanıyor..." : "Connecting...") : (isTR ? "Bağla" : "Connect")}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Kişisel Kartı */}
          <div className="bg-white rounded-xl border border-surface-300 shadow-card">
            <div className="p-5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#128C7E] rounded-xl flex items-center justify-center shadow-md">
                  <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.477A11.929 11.929 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.16 0-4.16-.69-5.795-1.862l-.415-.298-2.735.874.876-2.685-.326-.443A9.724 9.724 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-body text-ink">{isTR ? "WhatsApp Kişisel" : "WhatsApp Personal"}</h3>
                    {bConnected && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">
                        {isTR ? "Bağlı" : "Connected"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-tertiary">{isTR ? "Baileys ile kişisel hesap" : "Personal account via Baileys"}</p>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5">
              {bConnected ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-sm text-ink font-semibold">{bPhone ? `+${bPhone}` : (isTR ? "Bağlı" : "Connected")}</span>
                  </div>
                  <button
                    onClick={handleBaileysDisconnect}
                    disabled={bDisconnecting}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {bDisconnecting ? <SpinnerIcon className="w-4 h-4" /> : null}
                    {isTR ? "Bağlantıyı Kes" : "Disconnect"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-[11px] text-amber-800 font-medium">
                      {isTR
                        ? "⚠️ Baileys servisini önce sunucunuzda başlatın. Terminaldeki QR kodu tarayın."
                        : "⚠️ Start the Baileys service on your server first. Scan the QR code in the terminal."}
                    </p>
                  </div>
                  <input
                    type="text"
                    value={bUrl}
                    onChange={e => setBUrl(e.target.value)}
                    placeholder={isTR ? "Servis URL (ör: http://sunucu:3001)" : "Service URL (e.g. http://server:3001)"}
                    className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:border-primary bg-surface-50"
                  />
                  <input
                    type="password"
                    value={bSecret}
                    onChange={e => setBSecret(e.target.value)}
                    placeholder={isTR ? "Baileys Secret (BAILEYS_WEBHOOK_SECRET)" : "Baileys Secret"}
                    className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:border-primary bg-surface-50 font-mono"
                  />
                  <button
                    onClick={handleBaileysConnect}
                    disabled={bSaving || !bUrl.trim() || !bSecret.trim()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-[#128C7E] rounded-lg hover:bg-[#0d7a6e] transition-colors disabled:opacity-50"
                  >
                    {bSaving ? <SpinnerIcon className="w-4 h-4" /> : null}
                    {bSaving ? (isTR ? "Bağlanıyor..." : "Connecting...") : (isTR ? "Bağla" : "Connect")}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ─── How It Works ─── */}
        <div className="ds-card p-5">
          <h3 className="ds-section-title mb-3">
            {isTR ? "Nasıl Çalışır?" : "How it works?"}
          </h3>
          <ul className="text-caption text-ink-secondary space-y-2.5">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              {isTR
                ? "\"Hesabımı Bağla\" butonuna tiklayin — Meta OAuth sayfasina yonlendirileceksiniz"
                : "Click \"Connect My Account\" — you'll be redirected to Meta OAuth page"}
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              {isTR
                ? "Meta hesabinizi onaylayin — WhatsApp, Instagram ve Facebook izinlerini verin"
                : "Approve your Meta account — grant WhatsApp, Instagram and Facebook permissions"}
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              {isTR
                ? "Geri dondugunuzde mevcut kanallariniz yuklenir — kullanmak istediginizi secin"
                : "When you return, available channels load — select the ones you want to use"}
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              {isTR
                ? "Her kanal icin bir veya birden fazla hesap ekleyin — istediginiz zaman ekleyip cikarabilirsiniz"
                : "Add one or more accounts per channel — add or remove anytime"}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
