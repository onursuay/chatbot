"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface BillingData {
  plan: string
  stripe_customer_id: string | null
  plans: { id: string; name: string; price: number }[]
}

// SVG Logolar
function StripeLogo() {
  return (
    <svg viewBox="0 0 60 25" className="h-6">
      <path d="M5 10.2c0-.7.6-1 1.5-1 1.3 0 3 .4 4.3 1.1V6.5c-1.5-.6-2.9-.8-4.3-.8C3.2 5.7.8 7.5.8 10.4c0 4.5 6.2 3.8 6.2 5.7 0 .8-.7 1.1-1.7 1.1-1.5 0-3.4-.6-4.9-1.4v3.9c1.7.7 3.3 1 4.9 1 3.4 0 5.7-1.7 5.7-4.6-.1-4.8-6-4-6-5.9z" fill="#635bff"/>
      <path d="M14.6 16.2l-1 .5v3h4.2V8.3h-4.2v6.2c-1 1.2-2.5 1-3.3.4v-4.3c.8-.6 2.3-.8 3.3.4v5.2z" fill="#635bff"/>
      <path d="M23.5 5.7l-4.1.9v3.2l4.1-.9V5.7zM19.4 8.3h4.1v11.4h-4.1V8.3z" fill="#635bff"/>
      <path d="M29 8l-.3 1.5c-.5-.3-1.7-.5-2.4.2-.2.3-.4.7-.4 1.3v8.7h-4.2V8.3h4.2v1.2c.6-1 1.8-1.8 3.1-1.5z" fill="#635bff"/>
      <path d="M37.3 14.3c0-3.7-1.8-6.3-5.2-6.3-3.5 0-5.6 2.6-5.6 6.3 0 4.1 2.4 6.2 5.8 6.2 1.7 0 2.9-.4 3.9-1l-1-2.8c-.8.4-1.7.6-2.8.6-1.1 0-2.1-.4-2.2-1.7h5.1v-1.3zm-5.2-3.8c.8 0 1.3.6 1.3 1.6h-3c.1-1 .7-1.6 1.7-1.6z" fill="#635bff"/>
    </svg>
  )
}

function IyzicoLogo() {
  return (
    <svg viewBox="0 0 80 25" className="h-6">
      <rect width="80" height="25" rx="4" fill="#1E64FF" opacity="0.1"/>
      <text x="40" y="17" textAnchor="middle" fontFamily="system-ui" fontWeight="700" fontSize="13" fill="#1E64FF">iyzico</text>
    </svg>
  )
}

function PayTRLogo() {
  return (
    <svg viewBox="0 0 80 25" className="h-6">
      <rect width="80" height="25" rx="4" fill="#00C853" opacity="0.1"/>
      <text x="40" y="17" textAnchor="middle" fontFamily="system-ui" fontWeight="700" fontSize="13" fill="#00C853">PayTR</text>
    </svg>
  )
}

function ParafLogo() {
  return (
    <svg viewBox="0 0 80 25" className="h-6">
      <rect width="80" height="25" rx="4" fill="#FF6F00" opacity="0.1"/>
      <text x="40" y="17" textAnchor="middle" fontFamily="system-ui" fontWeight="700" fontSize="13" fill="#FF6F00">Param</text>
    </svg>
  )
}

export default function BillingPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "iyzico" | "paytr">("stripe")

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<BillingData>("/billing", { token })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [getToken])

  const handleSubscribe = async (planId: string) => {
    const token = getToken()
    if (!token) return
    setSubscribing(planId)
    try {
      const { url } = await api<{ url: string }>("/billing", {
        method: "POST", token,
        body: JSON.stringify({ plan: planId, payment_method: paymentMethod }),
      })
      if (url) window.location.href = url
    } catch (err: any) {
      alert(err.message || t("payment_error"))
    }
    setSubscribing(null)
  }

  const handlePortal = async () => {
    const token = getToken()
    if (!token) return
    try {
      const { url } = await api<{ url: string }>("/billing/portal", {
        method: "POST", token,
      })
      if (url) window.location.href = url
    } catch {}
  }

  const planLabel = (p: string) => {
    const map: Record<string, string> = { trial: t("plan_trial"), starter: t("plan_starter"), pro: t("plan_pro"), business: t("plan_business") }
    return map[p] || p
  }

  const PLAN_FEATURES: Record<string, string[]> = {
    trial: [t("feat_1_user"), t("feat_100_msg"), t("feat_basic_bot")],
    starter: [t("feat_2_users"), t("feat_1000_msg"), "AI Chatbot", "Broadcast", t("automation_cat")],
    pro: [t("feat_5_users"), t("feat_unlimited_msg"), "Flow Builder", "Analytics", t("templates"), t("feat_priority_support")],
    business: [t("feat_20_users"), t("feat_unlimited_msg"), t("feat_ig_fb_dm"), "Shopify", t("feat_api_access"), t("feat_custom_integration"), t("feat_dedicated_support")],
  }

  if (loading) return <div className="p-7 text-ink-secondary text-caption">{t("loading")}</div>

  return (
    <div className="p-7">
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("billing")}</h2>
          <p className="ds-page-subtitle">
            {t("current_plan")}: <span className="text-primary font-medium">{planLabel(data?.plan || "trial")}</span>
            {data?.stripe_customer_id && (
              <button onClick={handlePortal} className="text-primary hover:text-primary ml-4 underline text-caption">
                {t("invoice_management")}
              </button>
            )}
          </p>
        </div>
      </div>

      {/* Odeme Yontemi Secimi */}
      <div className="ds-card p-6 mb-8">
        <h3 className="ds-section-title mb-4">{t("payment_method")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: "stripe" as const, label: "Stripe", desc: t("intl_credit_card"), logo: <StripeLogo /> },
            { id: "iyzico" as const, label: "iyzico", desc: t("tr_credit_card_bank"), logo: <IyzicoLogo /> },
            { id: "paytr" as const, label: "PayTR", desc: t("tr_credit_card_transfer"), logo: <PayTRLogo /> },
            { id: "param" as const, label: "Param", desc: t("tr_digital_payment"), logo: <ParafLogo /> },
          ].map((pm) => (
            <button
              key={pm.id}
              onClick={() => setPaymentMethod(pm.id === "param" ? "iyzico" : pm.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-card-sm border transition ${
                paymentMethod === pm.id || (pm.id === "param" && paymentMethod === "iyzico")
                  ? "border-primary bg-primary/5"
                  : "border-surface-300 bg-surface-150 hover:border-surface-300"
              }`}
            >
              {pm.logo}
              <span className="text-caption text-ink-secondary">{pm.desc}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 text-micro text-ink-tertiary">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>{t("ssl_secure")}</span>
        </div>
      </div>

      {/* Plan kartlari */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: "starter", name: t("plan_starter"), price: "$29", priceTL: "999 TL", popular: false },
          { id: "pro", name: t("plan_pro"), price: "$79", priceTL: "2.999 TL", popular: true },
          { id: "business", name: t("plan_business"), price: "$199", priceTL: "6.999 TL", popular: false },
        ].map((plan) => {
          const isActive = data?.plan === plan.id
          const features = PLAN_FEATURES[plan.id] || []
          return (
            <div key={plan.id} className={`ds-card p-6 relative ${
              plan.popular ? "border-primary" : ""
            }`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-micro font-bold px-3 py-1 rounded-full">
                  {t("most_popular")}
                </div>
              )}
              <h3 className="text-ink font-bold text-lg">{plan.name}</h3>
              <div className="mt-3 mb-6">
                <span className="text-kpi font-bold text-ink">{plan.price}</span>
                <span className="text-ink-secondary text-caption"> /ay</span>
                <p className="text-ink-tertiary text-micro mt-1">{plan.priceTL} /ay</p>
              </div>
              <ul className="space-y-2 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-caption text-ink-secondary">
                    <svg className="w-4 h-4 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {isActive ? (
                <button disabled className="w-full bg-surface-100 text-ink-secondary font-bold py-2.5 rounded-btn text-caption">
                  {t("current_plan_btn")}
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribing === plan.id}
                  className={`w-full font-bold py-2.5 rounded-btn text-caption transition disabled:opacity-50 ${
                    plan.popular
                      ? "ds-btn-primary"
                      : "ds-btn-secondary"
                  }`}
                >
                  {subscribing === plan.id ? t("redirecting") : t("select_plan")}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Desteklenen odeme yontemleri */}
      <div className="mt-8 ds-card p-6">
        <h3 className="ds-section-title mb-4">{t("supported_methods")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Stripe */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-10 bg-[#635bff]/10 rounded-card-sm flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-5" fill="#635bff">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.19l-.893 5.575C4.746 22.81 7.489 24 10.725 24c2.6 0 4.507-.484 5.966-1.624 1.627-1.274 2.477-3.26 2.477-5.756 0-4.115-2.543-5.834-5.192-6.87z"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-caption text-ink font-medium">Stripe</p>
              <p className="text-micro text-ink-tertiary">Visa, Mastercard, Amex</p>
            </div>
          </div>

          {/* iyzico */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-10 bg-[#1E64FF]/10 rounded-card-sm flex items-center justify-center">
              <span className="text-[#1E64FF] font-bold text-caption">iyzico</span>
            </div>
            <div className="text-center">
              <p className="text-caption text-ink font-medium">iyzico</p>
              <p className="text-micro text-ink-tertiary">{t("credit_card_bkm")}</p>
            </div>
          </div>

          {/* PayTR */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-10 bg-[#00C853]/10 rounded-card-sm flex items-center justify-center">
              <span className="text-[#00C853] font-bold text-caption">PayTR</span>
            </div>
            <div className="text-center">
              <p className="text-caption text-ink font-medium">PayTR</p>
              <p className="text-micro text-ink-tertiary">{t("credit_card_transfer")}</p>
            </div>
          </div>

          {/* Param */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-16 h-10 bg-[#FF6F00]/10 rounded-card-sm flex items-center justify-center">
              <span className="text-[#FF6F00] font-bold text-caption">Param</span>
            </div>
            <div className="text-center">
              <p className="text-caption text-ink font-medium">Param</p>
              <p className="text-micro text-ink-tertiary">{t("digital_wallet_qr")}</p>
            </div>
          </div>
        </div>

        {/* Kart logolari */}
        <div className="mt-6 pt-4 border-t border-surface-300 flex items-center justify-center gap-4">
          {/* Visa */}
          <div className="w-12 h-8 bg-surface-150 rounded flex items-center justify-center">
            <svg viewBox="0 0 48 16" className="w-10 h-4">
              <path d="M19.5 1.3L12.7 14.7H8.5L5.1 4.2C4.9 3.4 4.7 3.1 4.1 2.8 3.1 2.3 1.5 1.8 0 1.5L.1 1.3H6.8C7.7 1.3 8.5 1.9 8.7 2.9L10.3 11.2L14.4 1.3H19.5Z" fill="#1A1F71"/>
              <path d="M34.5 10.1C34.5 6.5 29.5 6.3 29.5 4.7C29.6 4.2 30 3.7 31.1 3.5C31.6 3.5 33.1 3.4 34.7 4.1L35.4 1.6C34.5 1.3 33.4 1 32 1C27.2 1 23.8 3.6 23.8 7.2C23.7 9.8 26.1 11.2 27.8 12.1C29.6 13 30.2 13.5 30.2 14.2C30.1 15.3 28.8 15.7 27.6 15.7C25.8 15.8 24.8 15.3 24 14.9L23.3 17.5C24.1 17.9 25.7 18.2 27.3 18.2C32.5 18.2 35.8 15.7 34.5 10.1Z" fill="#1A1F71"/>
            </svg>
          </div>
          {/* Mastercard */}
          <div className="w-12 h-8 bg-surface-150 rounded flex items-center justify-center">
            <svg viewBox="0 0 32 20" className="w-8 h-5">
              <circle cx="11" cy="10" r="8" fill="#EB001B" opacity="0.9"/>
              <circle cx="21" cy="10" r="8" fill="#F79E1B" opacity="0.9"/>
              <path d="M16 3.8A8 8 0 0013 10a8 8 0 003 6.2A8 8 0 0019 10a8 8 0 00-3-6.2z" fill="#FF5F00"/>
            </svg>
          </div>
          {/* Amex */}
          <div className="w-12 h-8 bg-surface-150 rounded flex items-center justify-center">
            <span className="text-[#006FCF] font-bold text-[9px]">AMEX</span>
          </div>
          {/* Troy */}
          <div className="w-12 h-8 bg-surface-150 rounded flex items-center justify-center">
            <span className="text-[#00A3E0] font-bold text-[9px]">TROY</span>
          </div>
          {/* BKM */}
          <div className="w-12 h-8 bg-surface-150 rounded flex items-center justify-center">
            <span className="text-[#E31E24] font-bold text-[8px]">BKM</span>
          </div>
        </div>
      </div>

      {/* Ucretsiz plan */}
      <div className="mt-6 ds-card p-6">
        <h3 className="ds-section-title mb-2">{t("free_trial_title")}</h3>
        <p className="text-ink-secondary text-caption">
          {t("free_trial_desc")}
        </p>
      </div>
    </div>
  )
}
