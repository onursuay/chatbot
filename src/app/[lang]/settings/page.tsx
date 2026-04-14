"use client"

import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { useState, useEffect, useCallback } from "react"
import { useI18n } from "@/lib/i18n"

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

function InfoRow({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-surface-300 last:border-0">
      <span className="text-caption text-ink-secondary w-36 shrink-0">{label}</span>
      <span className={`text-ui text-ink text-right ${mono ? "font-mono text-xs bg-surface-150 px-2 py-0.5 rounded" : ""}`}>
        {value || "—"}
      </span>
    </div>
  )
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

export default function SettingsPage() {
  const { user, getToken } = useAuth()
  const { t } = useI18n()
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)

  useEffect(() => {
    if (window.FB) {
      setSdkReady(true)
      return
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId: META_APP_ID,
        cookie: true,
        xfbml: true,
        version: "v21.0",
      })
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
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const handleConnect = () => {
    if (!sdkReady || !window.FB) {
      setError("Facebook SDK yuklenemedi. Sayfayi yenileyin.")
      return
    }

    setError(null)
    setConnecting(true)

    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          sendCodeToBackend(response.authResponse.code)
        } else {
          setConnecting(false)
          setError("Facebook girisi iptal edildi.")
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      }
    )
  }

  const sendCodeToBackend = async (code: string) => {
    try {
      const token = getToken()
      if (!token) return

      await api("/embedded-signup/connect", {
        token,
        method: "POST",
        body: JSON.stringify({ code }),
      })

      await checkStatus()
      setError(null)
    } catch (err: any) {
      setError(err.message || "Baglanti sirasinda bir hata olustu.")
    } finally {
      setConnecting(false)
    }
  }

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  return (
    <div className="p-7">
      <div className="ds-page-header">
        <h2 className="ds-page-title">{t("settings")}</h2>
        <p className="ds-page-subtitle">{t("organization")} &amp; {t("profile")}</p>
      </div>

      <div className="max-w-2xl space-y-5">

        {/* Organizasyon */}
        <div className="ds-card p-6">
          <SectionHeader
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            }
            title={t("organization")}
          />
          <div>
            <InfoRow label={t("company_name")} value={user?.org_name} />
            <div className="flex items-start justify-between py-3">
              <span className="text-caption text-ink-secondary w-36 shrink-0">{t("plan")}</span>
              <span className={`ds-badge ${user?.org_plan === "trial" ? "ds-badge-warning" : "ds-badge-success"}`}>
                {user?.org_plan === "trial" ? t("trial_plan") : user?.org_plan}
              </span>
            </div>
          </div>
        </div>

        {/* WhatsApp Baglantisi */}
        <div className="ds-card p-6">
          <SectionHeader
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            }
            title={t("whatsapp_connection")}
            subtitle={loading ? undefined : status?.connected ? t("connected") : t("whatsapp_connect_desc")}
          />

          {loading ? (
            <div className="flex items-center gap-2 text-ink-secondary text-caption py-2">
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t("loading")}
            </div>
          ) : status?.connected ? (
            <div className="space-y-1">
              {/* Bagli banner */}
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-green-700 text-caption font-medium">{t("connected")}</span>
              </div>

              <InfoRow label="WABA" value={status.waba_name} />
              <InfoRow label="WABA ID" value={status.waba_id} mono />

              {status.phone_numbers && status.phone_numbers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-300">
                  <p className="text-caption text-ink-secondary mb-3">{t("phone_numbers")}</p>
                  <div className="space-y-2">
                    {status.phone_numbers.map((phone) => (
                      <div
                        key={phone.id}
                        className="flex items-center justify-between bg-surface-150 border border-surface-300 rounded-lg px-4 py-3"
                      >
                        <div>
                          <p className="text-ui text-ink font-medium">{phone.number}</p>
                          {phone.verified_name && (
                            <p className="text-caption text-ink-secondary mt-0.5">{phone.verified_name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`${
                            phone.quality_rating === "GREEN" ? "ds-badge-success" :
                            phone.quality_rating === "YELLOW" ? "ds-badge-warning" :
                            "ds-badge-danger"
                          }`}>
                            {phone.quality_rating}
                          </span>
                          <span className="ds-badge-neutral">{phone.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <p className="text-red-700 text-caption">{error}</p>
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={connecting || !sdkReady}
                className="ds-btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {connecting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("connecting")}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {t("connect_whatsapp")}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Profil */}
        <div className="ds-card p-6">
          <SectionHeader
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            }
            title={t("profile")}
          />

          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-surface-300">
            <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold text-sm">{initials}</span>
            </div>
            <div>
              <p className="text-ui font-semibold text-ink">{user?.full_name}</p>
              <p className="text-caption text-ink-secondary">{user?.email}</p>
            </div>
            <div className="ml-auto">
              <span className="ds-badge-neutral capitalize">{user?.role}</span>
            </div>
          </div>

          <div>
            <InfoRow label={t("full_name")} value={user?.full_name} />
            <InfoRow label={t("email")} value={user?.email} />
            <InfoRow label={t("role")} value={user?.role} />
          </div>
        </div>

      </div>
    </div>
  )
}
