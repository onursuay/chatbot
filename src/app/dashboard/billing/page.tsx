"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface BillingData {
  plan: string
  stripe_customer_id: string | null
  plans: { id: string; name: string; price: number }[]
}

const PLAN_FEATURES: Record<string, string[]> = {
  trial: ["1 kullanici", "100 mesaj/ay", "Temel bot"],
  starter: ["2 kullanici", "1.000 mesaj/ay", "AI Chatbot", "Broadcast", "Otomasyon"],
  pro: ["5 kullanici", "Sinirsiz mesaj", "Flow Builder", "Analytics", "Template yonetimi", "Oncelikli destek"],
  business: ["20 kullanici", "Sinirsiz mesaj", "Instagram + FB DM", "Shopify", "API erisimi", "Ozel entegrasyon", "Dedicated destek"],
}

export default function BillingPage() {
  const { getToken } = useAuth()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)

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
        body: JSON.stringify({ plan: planId }),
      })
      if (url) window.location.href = url
    } catch (err: any) {
      alert(err.message || "Odeme sayfasi acilamadi")
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
    const map: Record<string, string> = { trial: "Deneme", starter: "Baslangic", pro: "Profesyonel", business: "Isletme" }
    return map[p] || p
  }

  if (loading) return <div className="p-6 text-dark-400 text-sm">Yukleniyor...</div>

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-2">Abonelik ve Faturalama</h2>
      <p className="text-dark-400 text-sm mb-8">
        Mevcut plan: <span className="text-brand-400 font-medium">{planLabel(data?.plan || "trial")}</span>
        {data?.stripe_customer_id && (
          <button onClick={handlePortal} className="text-brand-400 hover:text-brand-300 ml-4 underline text-sm">
            Fatura yonetimi
          </button>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: "starter", name: "Baslangic", price: "$29", priceTL: "999 TL", popular: false },
          { id: "pro", name: "Profesyonel", price: "$79", priceTL: "2.999 TL", popular: true },
          { id: "business", name: "Isletme", price: "$199", priceTL: "6.999 TL", popular: false },
        ].map((plan) => {
          const isActive = data?.plan === plan.id
          const features = PLAN_FEATURES[plan.id] || []
          return (
            <div key={plan.id} className={`bg-dark-900 border rounded-xl p-6 relative ${
              plan.popular ? "border-brand-500" : "border-dark-800"
            }`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-500 text-dark-950 text-xs font-bold px-3 py-1 rounded-full">
                  En Populer
                </div>
              )}
              <h3 className="text-white font-semibold text-lg">{plan.name}</h3>
              <div className="mt-3 mb-6">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-dark-400 text-sm"> /ay</span>
                <p className="text-dark-500 text-xs mt-1">{plan.priceTL} /ay</p>
              </div>
              <ul className="space-y-2 mb-6">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-dark-300">
                    <svg className="w-4 h-4 text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {isActive ? (
                <button disabled className="w-full bg-dark-800 text-dark-400 font-semibold py-2.5 rounded-lg text-sm">
                  Mevcut Plan
                </button>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribing === plan.id}
                  className={`w-full font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50 ${
                    plan.popular
                      ? "bg-brand-500 hover:bg-brand-600 text-dark-950"
                      : "bg-dark-800 hover:bg-dark-700 text-white"
                  }`}
                >
                  {subscribing === plan.id ? "Yonlendiriliyor..." : "Plani Sec"}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Ücretsiz plan bilgisi */}
      <div className="mt-8 bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h3 className="text-white font-medium mb-2">Ucretsiz Deneme</h3>
        <p className="text-dark-400 text-sm">
          Tum yeni hesaplar 7 gun ucretsiz deneme ile baslar. Deneme suresi dolmadan plan secerseniz
          kesintisiz devam edersiniz. Kredi karti olmadan baslayabilirsiniz.
        </p>
      </div>
    </div>
  )
}
