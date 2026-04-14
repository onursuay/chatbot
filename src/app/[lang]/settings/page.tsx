"use client"

import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { useState, useEffect, useCallback } from "react"
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

const quickLinks = [
  {
    key: "team",
    labelTr: "Ekip Yönetimi",
    labelEn: "Team Management",
    descTr: "Üye davet et, rol ata",
    descEn: "Invite members, assign roles",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-100",
  },
  {
    key: "billing",
    labelTr: "Abonelik",
    labelEn: "Billing",
    descTr: "Plan, fatura, ödeme",
    descEn: "Plan, invoices, payments",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-100",
  },
  {
    key: "channels",
    labelTr: "Kanallar",
    labelEn: "Channels",
    descTr: "WhatsApp, Instagram, FB",
    descEn: "WhatsApp, Instagram, FB",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-100",
  },
  {
    key: "integrations",
    labelTr: "Entegrasyonlar",
    labelEn: "Integrations",
    descTr: "Shopify, Stripe, Webhooks",
    descEn: "Shopify, Stripe, Webhooks",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
      </svg>
    ),
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-100",
  },
  {
    key: "chatbot",
    labelTr: "Chatbot Ayarları",
    labelEn: "Chatbot Settings",
    descTr: "AI prompt, model, karşılama",
    descEn: "AI prompt, model, welcome msg",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    color: "text-primary",
    bg: "bg-primary-50",
    border: "border-primary/20",
  },
  {
    key: "analytics",
    labelTr: "Raporlar",
    labelEn: "Analytics",
    descTr: "Mesaj, kanal, bot istatistikleri",
    descEn: "Message, channel, bot stats",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    color: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-100",
  },
]

export default function SettingsPage() {
  const { user, getToken } = useAuth()
  const { t, lang, setLang } = useI18n()
  const router = useRouter()
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)

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
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [getToken])

  useEffect(() => { checkStatus() }, [checkStatus])

  const handleConnect = () => {
    if (!sdkReady || !window.FB) { setError("Facebook SDK yuklenemedi. Sayfayi yenileyin."); return }
    setError(null)
    setConnecting(true)
    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) sendCodeToBackend(response.authResponse.code)
        else { setConnecting(false); setError("Facebook girisi iptal edildi.") }
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
      setError(null)
    } catch (err: any) {
      setError(err.message || "Baglanti sirasinda bir hata olustu.")
    } finally { setConnecting(false) }
  }

  const handleLangChange = (newLang: Lang) => {
    setLang(newLang)
    router.push(localePath("settings", newLang))
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

        {/* Hızlı Erişim */}
        <div>
          <p className="text-caption text-ink-secondary mb-3 font-medium uppercase tracking-wide">
            {lang === "tr" ? "Hızlı Erişim" : "Quick Access"}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {quickLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => router.push(localePath(link.key === "analytics" ? "analytics" : link.key, lang))}
                className="ds-card p-4 text-left hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-150 group"
              >
                <div className={`w-8 h-8 rounded-lg ${link.bg} border ${link.border} flex items-center justify-center ${link.color} mb-3`}>
                  {link.icon}
                </div>
                <p className="text-ui font-medium text-ink group-hover:text-primary transition-colors">
                  {lang === "tr" ? link.labelTr : link.labelEn}
                </p>
                <p className="text-caption text-ink-secondary mt-0.5 leading-snug">
                  {lang === "tr" ? link.descTr : link.descEn}
                </p>
              </button>
            ))}
          </div>
        </div>

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
            <InfoRow label={lang === "tr" ? "Slug" : "Slug"} value={user?.org_slug} mono />
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
            <div>
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
                      <div key={phone.id} className="flex items-center justify-between bg-surface-150 border border-surface-300 rounded-lg px-4 py-3">
                        <div>
                          <p className="text-ui text-ink font-medium">{phone.number}</p>
                          {phone.verified_name && <p className="text-caption text-ink-secondary mt-0.5">{phone.verified_name}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={phone.quality_rating === "GREEN" ? "ds-badge-success" : phone.quality_rating === "YELLOW" ? "ds-badge-warning" : "ds-badge-danger"}>
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

        {/* Dil & Arayuz */}
        <div className="ds-card p-6">
          <SectionHeader
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
              </svg>
            }
            title={t("language")}
            subtitle={lang === "tr" ? "Arayüz dilini değiştir" : "Change interface language"}
          />
          <div className="flex gap-3">
            {(["tr", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => handleLangChange(l)}
                className={`flex items-center gap-3 flex-1 border rounded-xl px-4 py-3.5 transition-all duration-150 ${
                  lang === l
                    ? "border-primary bg-primary-50 shadow-sm"
                    : "border-surface-300 bg-white hover:border-primary/30 hover:bg-surface-150"
                }`}
              >
                <span className="text-xl">{l === "tr" ? "🇹🇷" : "🇬🇧"}</span>
                <div className="text-left">
                  <p className={`text-ui font-medium ${lang === l ? "text-primary" : "text-ink"}`}>
                    {l === "tr" ? "Türkçe" : "English"}
                  </p>
                  <p className="text-caption text-ink-secondary">{l === "tr" ? "Turkish" : "Türkçe"}</p>
                </div>
                {lang === l && (
                  <svg className="w-4 h-4 text-primary ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>
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
            <div className="flex items-start justify-between py-3 border-b border-surface-300">
              <span className="text-caption text-ink-secondary w-36 shrink-0">{t("role")}</span>
              <span className="ds-badge-neutral capitalize">{user?.role}</span>
            </div>
            <InfoRow label={lang === "tr" ? "Org ID" : "Org ID"} value={user?.org_id} mono />
          </div>
        </div>

      </div>
    </div>
  )
}
