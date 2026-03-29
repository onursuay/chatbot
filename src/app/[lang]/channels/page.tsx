"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || ""
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || ""

interface PhoneNumber {
  id: string
  db_id?: string
  number: string
  verified_name: string | null
  quality_rating: string
  status: string
  is_active?: boolean
}

interface WABAAccount {
  id?: string
  waba_id: string
  waba_name: string
  business_id: string
  is_active?: boolean
  phone_numbers: PhoneNumber[]
}

interface ChannelAccountInfo {
  id: string
  channel: string
  account_id: string
  page_id: string
  page_name: string
  is_active: boolean
}

interface ChannelStatus {
  connected: boolean
  accounts: WABAAccount[]
  channel_accounts: ChannelAccountInfo[]
}

declare global {
  interface Window { FB: any; fbAsyncInit: () => void }
}

/* ─── SVG Icons ─── */
function WhatsAppIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2"/>
      <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2"/>
      <circle cx="18" cy="6" r="1.5" fill="white"/>
    </svg>
  )
}

function MessengerIcon() {
  return (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.434 5.503 3.678 7.2V22l3.378-1.855c.9.25 1.855.384 2.944.384 5.523 0 10-4.144 10-9.243C22 6.145 17.523 2 12 2z"/>
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round"/>
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
      } ${loading ? "opacity-50" : ""}`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          enabled ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  )
}

/* ─── Account Selector Modal ─── */
function AccountSelector({
  accounts,
  selectedId,
  onSelect,
  onClose,
}: {
  accounts: { id: string; name: string; detail?: string }[]
  selectedId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-modal border border-surface-300 p-5 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-body text-ink mb-4">Hesap Seçin</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => { onSelect(acc.id); onClose() }}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                acc.id === selectedId
                  ? "border-primary bg-primary-50"
                  : "border-surface-300 hover:border-primary/30 hover:bg-surface-50"
              }`}
            >
              <div className="font-semibold text-sm text-ink">{acc.name}</div>
              {acc.detail && <div className="text-xs text-ink/50 mt-0.5">{acc.detail}</div>}
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 text-sm font-medium text-ink/50 hover:text-ink transition-colors">
          İptal
        </button>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   CHANNELS PAGE — Portfolyo Yönetimi
   ════════════════════════════════════════════ */
export default function ChannelsPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [status, setStatus] = useState<ChannelStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [selectorOpen, setSelectorOpen] = useState<string | null>(null)

  const isTR = t("loading") === "Yükleniyor..."

  // Facebook SDK
  useEffect(() => {
    if (window.FB) return
    window.fbAsyncInit = () => {
      window.FB.init({ appId: META_APP_ID, cookie: true, xfbml: true, version: "v21.0" })
    }
    if (!document.getElementById("fb-sdk")) {
      const script = document.createElement("script")
      script.id = "fb-sdk"
      script.src = "https://connect.facebook.net/tr_TR/sdk.js"
      script.async = true; script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  const reload = async () => {
    const token = getToken()
    if (!token) return
    const data = await api<ChannelStatus>("/channels/status", { token })
    setStatus(data)
  }

  useEffect(() => { reload().finally(() => setLoading(false)) }, [getToken])

  /* ── WhatsApp Embedded Signup — Portfolyo ── */
  const connectWhatsApp = () => {
    if (!window.FB) return alert("Facebook SDK yüklenemedi. Sayfayı yenileyin.")
    setConnecting("whatsapp")
    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          sendWhatsAppCode(response.authResponse.code)
        } else { setConnecting(null) }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      }
    )
  }

  const sendWhatsAppCode = async (code: string) => {
    try {
      const token = getToken()
      if (!token) return
      await api("/embedded-signup/connect", { method: "POST", token, body: JSON.stringify({ code }) })
      await reload()
    } catch (err: any) {
      alert(err.message || "Bağlantı hatası")
    } finally { setConnecting(null) }
  }

  /* ── Instagram / Facebook — Portfolyo: TÜM sayfaları bağla ── */
  const connectChannel = (channel: "instagram" | "facebook") => {
    if (!window.FB) return alert("Facebook SDK yüklenemedi")
    setConnecting(channel)

    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          window.FB.api("/me/accounts", { access_token: response.authResponse.accessToken }, async (pagesRes: any) => {
            if (pagesRes.data && pagesRes.data.length > 0) {
              const token = getToken()
              if (!token) { setConnecting(null); return }
              try {
                // TÜM sayfaları portfolyo olarak gönder
                const pages = pagesRes.data.map((p: any) => ({
                  page_id: p.id,
                  page_access_token: p.access_token,
                }))
                await api("/channels", {
                  method: "POST", token,
                  body: JSON.stringify({ channel, pages }),
                })
                await reload()
              } catch (err: any) {
                alert(err.message || "Bağlantı hatası")
              }
            }
            setConnecting(null)
          })
        } else { setConnecting(null) }
      },
      {
        scope: channel === "instagram"
          ? "instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging"
          : "pages_show_list,pages_messaging,pages_read_engagement",
      }
    )
  }

  /* ── Toggle bağlantı aç/kapat ── */
  const toggleConnection = async (channel: string, currentlyConnected: boolean) => {
    setToggling(channel)
    const token = getToken()
    if (!token) return

    if (currentlyConnected) {
      // Bağlantıyı kes
      try {
        await api("/channels", {
          method: "POST", token,
          body: JSON.stringify({ channel, action: "disconnect" }),
        })
        await reload()
      } catch {}
    } else {
      // Bağlantı kur
      if (channel === "whatsapp") connectWhatsApp()
      else connectChannel(channel as "instagram" | "facebook")
    }
    setToggling(null)
  }

  /* ── Aktif hesabı değiştir — sadece seçili olanı aktif yap ── */
  const switchAccount = async (channel: string, accountId: string) => {
    const token = getToken()
    if (!token) return
    // Bu kanal içindeki mevcut aktif hesapları deaktif et, seçileni aktif yap
    // Şimdilik basit: mevcut bağlı, seçilen zaten bağlı. Gelecekte genişletilebilir.
    await reload()
  }

  /* ── Data ── */
  const wabaAccounts = status?.accounts || []
  const allChannelAccounts = status?.channel_accounts || []
  const instagramAccounts = allChannelAccounts.filter(a => a.channel === "instagram")
  const facebookAccounts = allChannelAccounts.filter(a => a.channel === "facebook")

  // Aktif WhatsApp hesabı — ilk WABA'nın ilk numarası
  const activeWaba = wabaAccounts[0]
  const activePhone = activeWaba?.phone_numbers?.[0]

  // Aktif Instagram/Facebook hesabı
  const activeIg = instagramAccounts[0]
  const activeFb = facebookAccounts[0]

  if (loading) return <div className="p-7 text-ink-tertiary text-caption">{t("loading")}</div>

  const channels = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: <WhatsAppIcon />,
      iconBg: "bg-[#25D366]",
      connected: wabaAccounts.length > 0,
      activeAccount: activeWaba?.waba_name || null,
      activeDetail: activePhone?.number || null,
      allAccounts: wabaAccounts.map(w => ({
        id: w.waba_id,
        name: w.waba_name,
        detail: w.phone_numbers?.map(p => p.number).join(", "),
      })),
      onConnect: connectWhatsApp,
    },
    {
      id: "instagram",
      name: "Instagram DM",
      icon: <InstagramIcon />,
      iconBg: "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737]",
      connected: instagramAccounts.length > 0,
      activeAccount: activeIg?.page_name || null,
      activeDetail: activeIg?.account_id || null,
      allAccounts: instagramAccounts.map(a => ({
        id: a.id,
        name: a.page_name || a.account_id,
        detail: a.account_id,
      })),
      onConnect: () => connectChannel("instagram"),
    },
    {
      id: "facebook",
      name: "Messenger",
      icon: <MessengerIcon />,
      iconBg: "bg-[#0084FF]",
      connected: facebookAccounts.length > 0,
      activeAccount: activeFb?.page_name || null,
      activeDetail: activeFb?.page_id || null,
      allAccounts: facebookAccounts.map(a => ({
        id: a.id,
        name: a.page_name || a.account_id,
        detail: a.page_id,
      })),
      onConnect: () => connectChannel("facebook"),
    },
  ]

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{isTR ? "Kanallar" : "Channels"}</h2>
          <p className="ds-page-subtitle">{isTR ? "Mesajlaşma kanallarınızı bağlayın ve yönetin" : "Connect and manage your messaging channels"}</p>
        </div>
      </div>

      <div className="p-7">
        {/* Üst bilgi kartı */}
        <div className="ds-card p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-primary">
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-body text-ink">{isTR ? "Kanal Entegrasyonu" : "Channel Integration"}</h3>
            <p className="text-caption text-ink-secondary mt-0.5">
              {isTR
                ? "Mesajlaşma platformlarınızı bağlayarak tüm kanalları tek bir yerden yönetin."
                : "Connect your messaging platforms to manage all channels from one place."}
            </p>
          </div>
        </div>

        {/* Kanal Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className={`bg-white rounded-xl border transition-all duration-200 ${
                ch.connected ? "border-surface-300 shadow-card" : "border-surface-300 border-dashed"
              }`}
            >
              {/* Kart Üst: İkon + İsim + Toggle */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${ch.iconBg} rounded-xl flex items-center justify-center shadow-md`}>
                      {ch.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-body text-ink">{ch.name}</h3>
                    </div>
                  </div>
                  <Toggle
                    enabled={ch.connected}
                    loading={toggling === ch.id || connecting === ch.id}
                    onChange={() => {
                      if (ch.connected) {
                        if (confirm(isTR ? `${ch.name} bağlantısını kesmek istediğinize emin misiniz?` : `Disconnect ${ch.name}?`)) {
                          toggleConnection(ch.id, true)
                        }
                      } else {
                        ch.onConnect()
                      }
                    }}
                  />
                </div>

                {/* Durum badge */}
                <div className="ml-[52px]">
                  {ch.connected ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      {isTR ? "Bağlı" : "Connected"}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-ink-tertiary">
                      {isTR ? "Bağlanmadı" : "Not Connected"}
                    </span>
                  )}
                </div>
              </div>

              {/* Hesap bilgisi + Değiştir butonu (bağlıysa) */}
              {ch.connected && ch.activeAccount ? (
                <div className="border-t border-surface-300/60 px-5 py-4 bg-surface-50/50">
                  <div className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-2">
                    {isTR ? "Hesap:" : "Account:"}
                  </div>
                  <div className="text-sm font-medium text-ink">{ch.activeAccount}</div>
                  {ch.activeDetail && (
                    <div className="text-xs text-ink/40 mt-0.5 font-mono">{ch.activeDetail}</div>
                  )}

                  {/* Hesabı Değiştir butonu — sadece birden fazla hesap varsa */}
                  <button
                    onClick={() => {
                      if (ch.allAccounts.length > 1) {
                        setSelectorOpen(ch.id)
                      } else {
                        ch.onConnect()
                      }
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-ink/50 bg-white rounded-lg border border-surface-300 hover:border-primary/30 hover:text-primary transition-all"
                  >
                    <RefreshIcon />
                    {isTR ? "Hesabı Değiştir" : "Change Account"}
                  </button>
                </div>
              ) : !ch.connected ? (
                <div className="border-t border-surface-300/60 px-5 py-4">
                  <button
                    onClick={ch.onConnect}
                    disabled={connecting === ch.id}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 shadow-button-primary"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {connecting === ch.id
                      ? (isTR ? "Bağlanıyor..." : "Connecting...")
                      : (isTR ? `${ch.name}'ı Bağla` : `Connect ${ch.name}`)}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        {/* Nasıl çalışır */}
        <div className="mt-6 ds-card p-5">
          <h3 className="ds-section-title mb-2">{isTR ? "Nasıl Çalışır?" : "How it works?"}</h3>
          <ul className="text-caption text-ink-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              {isTR ? "Bağlamak istediğiniz kanalın toggle butonunu açın" : "Turn on the toggle for the channel you want to connect"}
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              {isTR ? "Facebook penceresi açılır — tüm hesaplarınızı seçin ve onaylayın" : "Facebook window opens — select all your accounts and approve"}
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
              {isTR ? "Tüm seçtiğiniz hesaplar portfolyonuza eklenir" : "All selected accounts are added to your portfolio"}
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary-50 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">4</span>
              {isTR ? "\"Hesabı Değiştir\" ile istediğiniz hesabı aktif edin" : "Use \"Change Account\" to activate the account you want"}
            </li>
          </ul>
        </div>
      </div>

      {/* Hesap Seçici Modal */}
      {selectorOpen && (() => {
        const ch = channels.find(c => c.id === selectorOpen)
        if (!ch) return null
        return (
          <AccountSelector
            accounts={ch.allAccounts}
            selectedId={ch.allAccounts[0]?.id || null}
            onSelect={(id) => switchAccount(ch.id, id)}
            onClose={() => setSelectorOpen(null)}
          />
        )
      })()}
    </div>
  )
}
