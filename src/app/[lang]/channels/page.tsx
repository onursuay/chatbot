"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || ""
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || ""

interface PhoneNumber {
  id: string
  number: string
  verified_name: string | null
  quality_rating: string
  status: string
}

interface WABAAccount {
  waba_id: string
  waba_name: string
  business_id: string
  phone_numbers: PhoneNumber[]
}

interface ChannelAccountInfo {
  id: string
  channel: string
  account_id: string
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

// WhatsApp gercek logo
function WhatsAppIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="white" strokeWidth="2"/>
      <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2"/>
      <circle cx="18" cy="6" r="1.5" fill="white"/>
    </svg>
  )
}

function MessengerIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
      <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.434 5.503 3.678 7.2V22l3.378-1.855c.9.25 1.855.384 2.944.384 5.523 0 10-4.144 10-9.243C22 6.145 17.523 2 12 2z"/>
    </svg>
  )
}

export default function ChannelsPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [status, setStatus] = useState<ChannelStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  // Facebook SDK init
  useEffect(() => {
    if (window.FB) return
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      })
    }
    if (!document.getElementById("fb-sdk")) {
      const script = document.createElement("script")
      script.id = "fb-sdk"
      script.src = "https://connect.facebook.net/tr_TR/sdk.js"
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  const reload = async () => {
    const token = getToken()
    if (!token) return
    const data = await api<ChannelStatus>("/channels/status", { token })
    setStatus(data)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [getToken])

  // WhatsApp Embedded Signup
  const connectWhatsApp = () => {
    if (!window.FB) return alert("Facebook SDK yuklenemedi. Sayfayi yenileyin.")
    setConnecting("whatsapp")

    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          sendWhatsAppCode(response.authResponse.code)
        } else {
          setConnecting(null)
        }
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
      await api("/embedded-signup/connect", {
        method: "POST", token,
        body: JSON.stringify({ code }),
      })
      await reload()
    } catch (err: any) {
      alert(err.message || t("msg_send_error"))
    } finally {
      setConnecting(null)
    }
  }

  // Instagram / Facebook bagla
  const connectChannel = (channel: "instagram" | "facebook") => {
    if (!window.FB) return alert("Facebook SDK yuklenemedi")
    setConnecting(channel)

    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          window.FB.api("/me/accounts", { access_token: response.authResponse.accessToken }, async (pagesRes: any) => {
            if (pagesRes.data && pagesRes.data.length > 0) {
              const page = pagesRes.data[0]
              const token = getToken()
              if (!token) return
              try {
                await api("/channels", {
                  method: "POST", token,
                  body: JSON.stringify({ channel, page_access_token: page.access_token, page_id: page.id }),
                })
                await reload()
              } catch (err: any) {
                alert(err.message || t("msg_send_error"))
              }
            }
            setConnecting(null)
          })
        } else {
          setConnecting(null)
        }
      },
      {
        scope: channel === "instagram"
          ? "instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging"
          : "pages_show_list,pages_messaging,pages_read_engagement",
      }
    )
  }

  // WABA baglantisini kes
  const disconnectWaba = async (wabaId: string) => {
    if (!confirm(t("disconnect_confirm"))) return
    setDisconnecting(`waba_${wabaId}`)
    const token = getToken()
    if (!token) return

    try {
      await api("/channels", {
        method: "POST", token,
        body: JSON.stringify({ channel: "whatsapp", action: "disconnect", waba_id: wabaId }),
      })
      await reload()
    } catch {}
    setDisconnecting(null)
  }

  // Channel account baglantisini kes
  const disconnectChannelAccount = async (accountId: string) => {
    if (!confirm(t("disconnect_confirm"))) return
    setDisconnecting(accountId)
    const token = getToken()
    if (!token) return

    try {
      await api("/channels", {
        method: "POST", token,
        body: JSON.stringify({ action: "disconnect_account", channel_account_id: accountId }),
      })
      await reload()
    } catch {}
    setDisconnecting(null)
  }

  const wabaAccounts = status?.accounts || []
  const instagramAccounts = (status?.channel_accounts || []).filter(a => a.channel === "instagram")
  const facebookAccounts = (status?.channel_accounts || []).filter(a => a.channel === "facebook")

  const qualityColors: Record<string, string> = {
    GREEN: "text-green-400",
    YELLOW: "text-yellow-400",
    RED: "text-red-400",
  }

  if (loading) return <div className="p-7 text-ink-tertiary text-caption">{t("loading")}</div>

  return (
    <div className="p-7">
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("channel_management")}</h2>
          <p className="ds-page-subtitle">{t("channel_management_desc")}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ==================== WHATSAPP ==================== */}
        <div className="bg-white border border-surface-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#25D366] rounded-card-sm flex items-center justify-center">
                <WhatsAppIcon />
              </div>
              <div>
                <h3 className="text-body-medium font-medium text-ink">WhatsApp</h3>
                <p className="text-micro text-ink-secondary">{t("whatsapp_desc")}</p>
              </div>
            </div>
            <button
              onClick={connectWhatsApp}
              disabled={connecting === "whatsapp"}
              className="ds-btn-primary disabled:opacity-50"
            >
              {connecting === "whatsapp" ? t("connecting") : t("connect")}
            </button>
          </div>

          {wabaAccounts.length > 0 ? (
            <div className="space-y-3">
              {wabaAccounts.map((waba) => (
                <div key={waba.waba_id} className="bg-white border border-surface-300 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="ds-badge-success">{t("connected")}</span>
                      <span className="text-body-medium font-medium text-ink">{waba.waba_name}</span>
                      <span className="text-caption text-ink-secondary">({waba.waba_id})</span>
                    </div>
                    <button
                      onClick={() => disconnectWaba(waba.waba_id)}
                      disabled={disconnecting === `waba_${waba.waba_id}`}
                      className="ds-btn-danger ds-btn-sm disabled:opacity-50"
                    >
                      {disconnecting === `waba_${waba.waba_id}` ? "..." : t("disconnect")}
                    </button>
                  </div>

                  {waba.phone_numbers && waba.phone_numbers.length > 0 && (
                    <div className="space-y-2">
                      {waba.phone_numbers.map((phone) => (
                        <div key={phone.id} className="flex items-center justify-between bg-white border border-surface-300 rounded px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="text-caption font-mono text-ink">{phone.number}</span>
                            {phone.verified_name && (
                              <span className="text-caption text-ink-secondary">{phone.verified_name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-caption font-medium ${qualityColors[phone.quality_rating] || "text-ink-secondary"}`}>
                              {phone.quality_rating}
                            </span>
                            <span className="text-caption text-ink-secondary">{phone.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-caption text-ink-secondary">{t("no_whatsapp_connected")}</p>
          )}
        </div>

        {/* ==================== INSTAGRAM ==================== */}
        <div className="bg-white border border-surface-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] rounded-card-sm flex items-center justify-center">
                <InstagramIcon />
              </div>
              <div>
                <h3 className="text-body-medium font-medium text-ink">Instagram DM</h3>
                <p className="text-micro text-ink-secondary">{t("instagram_desc")}</p>
              </div>
            </div>
            <button
              onClick={() => connectChannel("instagram")}
              disabled={connecting === "instagram"}
              className="ds-btn-primary disabled:opacity-50"
            >
              {connecting === "instagram" ? t("connecting") : t("connect")}
            </button>
          </div>

          {instagramAccounts.length > 0 ? (
            <div className="space-y-2">
              {instagramAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between bg-white border border-surface-300 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="ds-badge-success">{t("connected")}</span>
                    <span className="text-body-medium font-medium text-ink">{acc.page_name || acc.account_id}</span>
                  </div>
                  <button
                    onClick={() => disconnectChannelAccount(acc.id)}
                    disabled={disconnecting === acc.id}
                    className="ds-btn-danger ds-btn-sm disabled:opacity-50"
                  >
                    {disconnecting === acc.id ? "..." : t("disconnect")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-caption text-ink-secondary">{t("no_instagram_connected")}</p>
          )}
        </div>

        {/* ==================== FACEBOOK ==================== */}
        <div className="bg-white border border-surface-300 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0084FF] rounded-card-sm flex items-center justify-center">
                <MessengerIcon />
              </div>
              <div>
                <h3 className="text-body-medium font-medium text-ink">Facebook Messenger</h3>
                <p className="text-micro text-ink-secondary">{t("facebook_desc")}</p>
              </div>
            </div>
            <button
              onClick={() => connectChannel("facebook")}
              disabled={connecting === "facebook"}
              className="ds-btn-primary disabled:opacity-50"
            >
              {connecting === "facebook" ? t("connecting") : t("connect")}
            </button>
          </div>

          {facebookAccounts.length > 0 ? (
            <div className="space-y-2">
              {facebookAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between bg-white border border-surface-300 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="ds-badge-success">{t("connected")}</span>
                    <span className="text-body-medium font-medium text-ink">{acc.page_name || acc.account_id}</span>
                  </div>
                  <button
                    onClick={() => disconnectChannelAccount(acc.id)}
                    disabled={disconnecting === acc.id}
                    className="ds-btn-danger ds-btn-sm disabled:opacity-50"
                  >
                    {disconnecting === acc.id ? "..." : t("disconnect")}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-caption text-ink-secondary">{t("no_facebook_connected")}</p>
          )}
        </div>
      </div>

      <div className="mt-8 ds-card p-6">
        <h3 className="ds-section-title mb-2">{t("how_it_works")}</h3>
        <ul className="text-caption text-ink-secondary space-y-2">
          <li>{t("channel_step1_v2")}</li>
          <li>{t("channel_step2_v2")}</li>
          <li>{t("channel_step3")}</li>
          <li>{t("channel_step4")}</li>
        </ul>
      </div>
    </div>
  )
}
