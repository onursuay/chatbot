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

/* ─── Toggle Switch ─── */

function Toggle({ enabled, onChange, loading }: { enabled: boolean; onChange: () => void; loading?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={loading}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        enabled ? "bg-primary" : "bg-surface-350"
      } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-[22px]" : "translate-x-0.5"
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

/* ════════════════════════════════════════════
   CHANNELS PAGE — Kanal Yonetimi (Multi-Account)
   ════════════════════════════════════════════ */

export default function ChannelsPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()

  const isTR = t("loading") === "Yukleniyor..."

  // States
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null)
  const [available, setAvailable] = useState<AvailableResponse | null>(null)
  const [selections, setSelections] = useState<ChannelSelection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null) // platform_id or selection id being saved
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  // "Add account" dropdown open state per channel
  const [addDropdownOpen, setAddDropdownOpen] = useState<string | null>(null)

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

  // Fetch available channels + selections
  const fetchAvailable = useCallback(async () => {
    const token = getToken()
    if (!token) return
    try {
      const data = await api<AvailableResponse>("/channels/available", { token })
      setAvailable(data)
      setSelections(data.selections || [])
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
      showToast(isTR ? "Meta hesabi basariyla baglandi!" : "Meta account connected successfully!")
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
      const data = await api<{ url: string }>("/meta/connect", { token })
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      showToast(err.message || (isTR ? "Baglanti hatasi" : "Connection error"), "error")
      setConnecting(false)
    }
  }

  // Add / update a channel selection (POST)
  const handleSelectChannel = async (
    channel: "whatsapp" | "instagram" | "messenger",
    platformId: string,
    platformName: string,
    platformDetail: string,
    metadata: Record<string, any>,
    enabled: boolean
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
          enabled,
        }),
      })
      await fetchAvailable()
      showToast(isTR ? `${channelLabel(channel)} kaydedildi` : `${channelLabel(channel)} saved`)
    } catch (err: any) {
      showToast(err.message || (isTR ? "Kayit hatasi" : "Save error"), "error")
    } finally {
      setSavingId(null)
    }
  }

  // Remove a channel selection (DELETE)
  const handleRemoveSelection = async (selectionId: string, channelName: string) => {
    const token = getToken()
    if (!token || !selectionId) return
    setSavingId(selectionId)
    try {
      await api(`/channels/select?id=${selectionId}`, {
        method: "DELETE",
        token,
      })
      await fetchAvailable()
      showToast(isTR ? `${channelName} hesap kaldirildi` : `${channelName} account removed`)
    } catch (err: any) {
      showToast(err.message || (isTR ? "Silme hatasi" : "Remove error"), "error")
    } finally {
      setSavingId(null)
    }
  }

  // Toggle enable/disable for a specific selection
  const handleToggleSelection = async (selection: ChannelSelection) => {
    await handleSelectChannel(
      selection.channel as "whatsapp" | "instagram" | "messenger",
      selection.platform_id,
      selection.platform_name || "",
      selection.platform_detail || "",
      selection.metadata || {},
      !selection.enabled
    )
  }

  function channelLabel(ch: string) {
    if (ch === "whatsapp") return "WhatsApp"
    if (ch === "instagram") return "Instagram"
    if (ch === "messenger") return "Messenger"
    return ch
  }

  // Get all selections for a channel
  const getSelections = (channel: string) => selections.filter((s) => s.channel === channel)
  const getEnabledCount = (channel: string) => selections.filter((s) => s.channel === channel && s.enabled).length

  // Build flat option lists
  const whatsappOptions: { id: string; label: string; detail: string; wabaId: string; wabaName: string }[] = []
  for (const waba of available?.whatsapp || []) {
    for (const phone of waba.phone_numbers || []) {
      whatsappOptions.push({
        id: phone.id,
        label: phone.verified_name || waba.waba_name,
        detail: phone.display_phone_number,
        wabaId: waba.waba_id,
        wabaName: waba.waba_name,
      })
    }
  }

  const instagramOptions = (available?.instagram || []).map((ig) => ({
    id: ig.id,
    label: ig.name || ig.username,
    detail: ig.username ? `@${ig.username}` : ig.id,
    pageId: ig.page_id,
    pageName: ig.page_name,
  }))

  const pageOptions = (available?.pages || []).map((p) => ({
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

  // Format expiry date
  const formatExpiry = (dateStr: string | null) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return isTR ? "Suresi dolmus" : "Expired"
    if (diffDays === 1) return isTR ? "1 gun kaldi" : "1 day left"
    return isTR ? `${diffDays} gun kaldi` : `${diffDays} days left`
  }

  const qualityDot = (rating: string) => {
    if (rating === "GREEN") return "bg-emerald-500"
    if (rating === "YELLOW") return "bg-amber-500"
    if (rating === "RED") return "bg-red-500"
    return "bg-surface-350"
  }

  // Loading state
  if (loading) {
    return <div className="p-7 text-ink-tertiary text-caption">{t("loading")}</div>
  }

  const isConnected = metaStatus?.connected === true

  // Channel card config
  type ChannelOption = { id: string; label: string; detail: string; [key: string]: any }

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
        metadata: { page_id: opt.pageId, page_name: opt.pageName },
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

      {/* Page Header */}
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{isTR ? "Kanal Yonetimi" : "Channel Management"}</h2>
          <p className="ds-page-subtitle">
            {isTR
              ? "Meta hesabinizi baglayarak WhatsApp, Instagram ve Messenger kanallarini tek yerden yonetin"
              : "Connect your Meta account to manage WhatsApp, Instagram and Messenger from one place"}
          </p>
        </div>
      </div>

      <div className="p-7 space-y-6">
        {/* ─── Connection Status Banner ─── */}
        {!isConnected ? (
          <div className="ds-card p-6">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                <LinkIcon />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="font-bold text-lg text-ink">
                  {isTR ? "Meta Hesabinizi Baglayin" : "Connect Your Meta Account"}
                </h3>
                <p className="text-caption text-ink-secondary mt-1">
                  {isTR
                    ? "WhatsApp, Instagram ve Messenger kanallarini kullanabilmek icin tek bir Meta OAuth baglantisi yeterlidir."
                    : "A single Meta OAuth connection is enough to use WhatsApp, Instagram and Messenger channels."}
                </p>
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="ds-btn-primary px-8 py-3 text-base font-bold flex items-center gap-2 flex-shrink-0"
              >
                {connecting ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                    {isTR ? "Yonlendiriliyor..." : "Redirecting..."}
                  </>
                ) : (
                  <>
                    <BoltIcon />
                    {isTR ? "Hesabimi Bagla" : "Connect My Account"}
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="ds-card p-5 border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircleIcon />
                </div>
                <div>
                  <h3 className="font-bold text-body text-emerald-800">
                    {isTR ? "Meta Hesabi Bagli" : "Meta Account Connected"}
                  </h3>
                  <p className="text-xs text-emerald-600 mt-0.5">
                    {metaStatus?.expires_at && formatExpiry(metaStatus.expires_at)}
                    {metaStatus?.scopes && metaStatus.scopes.length > 0 && (
                      <span className="ml-2 opacity-60">
                        {metaStatus.scopes.length} {isTR ? "izin" : "permission"}{metaStatus.scopes.length > 1 ? (isTR ? "" : "s") : ""}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="text-sm font-medium text-emerald-700 hover:text-emerald-900 underline underline-offset-2 transition-colors"
              >
                {isTR ? "Yeniden Bagla" : "Reconnect"}
              </button>
            </div>
          </div>
        )}

        {/* ─── Channel Cards Grid ─── */}
        {isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {channelCards.map((card) => {
              const channelSelections = getSelections(card.channel)
              const enabledCount = getEnabledCount(card.channel)
              const hasOptions = card.options.length > 0

              // Unselected options (not yet added)
              const selectedPlatformIds = new Set(channelSelections.map((s) => s.platform_id))
              const unselectedOptions = card.options.filter((o) => !selectedPlatformIds.has(o.id))
              const isDropdownOpen = addDropdownOpen === card.channel

              return (
                <div
                  key={card.channel}
                  className={`bg-white rounded-xl border transition-all duration-200 ${
                    enabledCount > 0 ? "border-surface-300 shadow-card" : "border-surface-300 border-dashed"
                  }`}
                >
                  {/* Card Header: Icon + Name + Count */}
                  <div className="p-5 pb-3">
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
                        {card.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-body text-ink">{card.name}</h3>
                        <p className="text-[11px] text-ink-tertiary">{card.subtitle}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status summary */}
                  <div className="px-5 pb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-ink-tertiary font-medium">Status:</span>
                      {channelSelections.length > 0 ? (
                        <span className={`inline-flex items-center gap-1.5 font-bold ${enabledCount > 0 ? "text-emerald-600" : "text-ink-tertiary"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${enabledCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-surface-350"}`} />
                          {enabledCount > 0
                            ? (isTR ? `${enabledCount} hesap bagli` : `${enabledCount} account${enabledCount > 1 ? "s" : ""} connected`)
                            : (isTR ? "Tumu devre disi" : "All disabled")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-medium text-ink-tertiary">
                          <span className="w-1.5 h-1.5 rounded-full bg-surface-350" />
                          {isTR ? "Hesap eklenmemis" : "No accounts added"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ─── Selected Accounts List ─── */}
                  {channelSelections.length > 0 && (
                    <div className="px-5 pb-3">
                      <div className="rounded-lg border border-surface-200 overflow-hidden divide-y divide-surface-200">
                        {channelSelections.map((sel) => {
                          const isSelSaving = savingId === sel.platform_id || savingId === sel.id
                          const quality = card.channel === "whatsapp" ? getQualityRating(sel.platform_id) : null

                          return (
                            <div key={sel.id || sel.platform_id} className="bg-surface-50 px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                {/* Toggle */}
                                <Toggle
                                  enabled={sel.enabled}
                                  loading={isSelSaving}
                                  onChange={() => handleToggleSelection(sel)}
                                />

                                {/* Account info */}
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-semibold text-ink truncate">
                                    {sel.platform_name || "-"}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {sel.platform_detail && (
                                      <span className="text-[11px] text-ink/40 font-mono truncate">{sel.platform_detail}</span>
                                    )}
                                    {quality && (
                                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${qualityDot(quality)}`} title={`Quality: ${quality}`} />
                                    )}
                                  </div>
                                </div>

                                {/* Remove button */}
                                <button
                                  onClick={() => sel.id && handleRemoveSelection(sel.id, card.name)}
                                  disabled={isSelSaving}
                                  className="text-xs font-medium text-red-400 hover:text-red-600 transition-colors disabled:opacity-40 flex-shrink-0 px-1.5 py-0.5 rounded hover:bg-red-50"
                                  title={isTR ? "Kaldir" : "Remove"}
                                >
                                  {isSelSaving ? (
                                    <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                                    </svg>
                                  ) : (
                                    isTR ? "Kes" : "Remove"
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ─── Add Account Dropdown ─── */}
                  <div className="border-t border-surface-300/60 px-5 py-4">
                    {hasOptions && unselectedOptions.length > 0 ? (
                      <div className="relative">
                        <button
                          onClick={() => setAddDropdownOpen(isDropdownOpen ? null : card.channel)}
                          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-primary border border-primary/30 rounded-lg hover:bg-primary-50 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                            <path d="M12 5v14m-7-7h14" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {isTR ? "Hesap Ekle" : "Add Account"}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`w-3.5 h-3.5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}>
                            <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>

                        {/* Dropdown list */}
                        {isDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-surface-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                            {unselectedOptions.map((opt) => {
                              const isOptSaving = savingId === opt.id
                              return (
                                <button
                                  key={opt.id}
                                  disabled={isOptSaving}
                                  onClick={() => {
                                    const payload = card.buildPayload(opt)
                                    handleSelectChannel(
                                      card.channel,
                                      opt.id,
                                      payload.platformName,
                                      payload.platformDetail,
                                      payload.metadata,
                                      true
                                    )
                                    setAddDropdownOpen(null)
                                  }}
                                  className="w-full text-left px-3 py-2.5 hover:bg-surface-50 transition-colors text-xs border-b border-surface-100 last:border-b-0 disabled:opacity-50"
                                >
                                  <div className="font-semibold text-ink">{opt.label}</div>
                                  <div className="text-ink/40 font-mono mt-0.5">{opt.detail}</div>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ) : hasOptions && unselectedOptions.length === 0 ? (
                      <div className="py-2 text-center text-xs text-ink-tertiary">
                        {isTR ? "Tum hesaplar eklendi" : "All accounts added"}
                      </div>
                    ) : (
                      <div className="py-2 px-3 rounded-lg bg-surface-50 border border-dashed border-surface-300 text-xs text-ink-tertiary text-center">
                        {isTR ? "Kullanilabilir hesap yok" : "No accounts available"}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── How It Works ─── */}
        <div className="ds-card p-5">
          <h3 className="ds-section-title mb-3">
            {isTR ? "Nasil Calisir?" : "How it works?"}
          </h3>
          <ul className="text-caption text-ink-secondary space-y-2.5">
            <li className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              {isTR
                ? "\"Hesabimi Bagla\" butonuna tiklayin — Meta OAuth sayfasina yonlendirileceksiniz"
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
                ? "Her kanala birden fazla hesap ekleyebilir, toggle ile aktif/pasif yapabilirsiniz"
                : "You can add multiple accounts per channel and toggle them on/off individually"}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
