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

export default function SettingsPage() {
  const { user, getToken } = useAuth()
  const { t } = useI18n()
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)

  // Facebook SDK yükle
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

  // Bağlantı durumunu kontrol et
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

  // Embedded Signup başlat
  const handleConnect = () => {
    if (!sdkReady || !window.FB) {
      setError("Facebook SDK yüklenemedi. Sayfayı yenileyin.")
      return
    }

    setError(null)
    setConnecting(true)

    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          // Code'u backend'e gönder
          sendCodeToBackend(response.authResponse.code)
        } else {
          setConnecting(false)
          setError("Facebook girişi iptal edildi.")
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
      setError(err.message || "Bağlantı sırasında bir hata oluştu.")
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6">{t("settings")}</h2>

      <div className="max-w-2xl space-y-6">
        {/* Organizasyon */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <h3 className="text-white font-medium text-[15px] mb-4">{t("organization")}</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-dark-400">{t("company_name")}</label>
              <p className="text-white text-[15px]">{user?.org_name}</p>
            </div>
            <div>
              <label className="text-sm text-dark-400">{t("plan")}</label>
              <p className="text-brand-400 capitalize text-[15px]">{user?.org_plan === "trial" ? t("trial_plan") : user?.org_plan}</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Bağlantısı */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <h3 className="text-white font-medium text-[15px] mb-4">{t("whatsapp_connection")}</h3>

          {loading ? (
            <p className="text-dark-400 text-sm">{t("loading")}</p>
          ) : status?.connected ? (
            /* Bağlı durumu */
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                <span className="text-green-400 text-sm font-medium">{t("connected")}</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-dark-400">WABA</label>
                  <p className="text-white text-[15px]">{status.waba_name}</p>
                </div>
                <div>
                  <label className="text-sm text-dark-400">WABA ID</label>
                  <p className="text-white text-[15px] font-mono">{status.waba_id}</p>
                </div>
              </div>

              {status.phone_numbers && status.phone_numbers.length > 0 && (
                <div className="border-t border-dark-800 pt-4">
                  <label className="text-sm text-dark-400 block mb-2">{t("phone_numbers")}</label>
                  {status.phone_numbers.map((phone) => (
                    <div key={phone.id} className="flex items-center justify-between bg-dark-800/50 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-white text-[15px]">{phone.number}</p>
                        {phone.verified_name && (
                          <p className="text-dark-400 text-xs">{phone.verified_name}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          phone.quality_rating === "GREEN" ? "bg-green-500/20 text-green-400" :
                          phone.quality_rating === "YELLOW" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>
                          {phone.quality_rating}
                        </span>
                        <span className="text-xs text-dark-400">{phone.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Bağlı değil */
            <div>
              <p className="text-dark-400 text-sm mb-4">
                {t("whatsapp_connect_desc")}
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={connecting || !sdkReady}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-dark-950 font-semibold px-5 py-2.5 rounded-lg transition text-[14px] flex items-center gap-2"
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
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {t("connect_whatsapp")}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Profil */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <h3 className="text-white font-medium text-[15px] mb-4">{t("profile")}</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-dark-400">{t("full_name")}</label>
              <p className="text-white text-[15px]">{user?.full_name}</p>
            </div>
            <div>
              <label className="text-sm text-dark-400">{t("email")}</label>
              <p className="text-white text-[15px]">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-dark-400">{t("role")}</label>
              <p className="text-white capitalize text-[15px]">{user?.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
