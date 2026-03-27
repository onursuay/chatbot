"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  category: string
  connected: boolean
  config?: Record<string, string>
}

const INTEGRATIONS: Omit<Integration, "connected">[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Sipariş bildirimleri, sepet hatırlatma, kargo takibi",
    icon: "🛍",
    category: "E-Ticaret",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "WordPress e-ticaret entegrasyonu",
    icon: "🛒",
    category: "E-Ticaret",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Ödeme bildirimleri ve fatura takibi",
    icon: "💳",
    category: "Ödeme",
  },
  {
    id: "iyzico",
    name: "Iyzico",
    description: "Türkiye ödeme altyapisi entegrasyonu",
    icon: "🏦",
    category: "Ödeme",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "CRM senkronizasyonu ve lead yönetimi",
    icon: "🔶",
    category: "CRM",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    description: "Kurumsal CRM entegrasyonu",
    icon: "☁️",
    category: "CRM",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "5000+ uygulama ile otomasyon",
    icon: "⚡",
    category: "Otomasyon",
  },
  {
    id: "make",
    name: "Make (Integromat)",
    description: "Gelişmiş otomasyon akışları",
    icon: "🔄",
    category: "Otomasyon",
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    description: "Kişi ve mesaj verilerini tabloya aktar",
    icon: "📊",
    category: "Verimlilik",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Randevu oluşturma ve hatirlatma",
    icon: "📅",
    category: "Verimlilik",
  },
  {
    id: "ctwa_ads",
    name: "Click-to-WhatsApp Ads",
    description: "Facebook/Instagram reklamlarından direkt WhatsApp'a lead düşürme",
    icon: "📢",
    category: "Pazarlama",
  },
  {
    id: "webhook",
    name: "Custom Webhook",
    description: "Ozel webhook URL ile herhangi bir servise bağlanın",
    icon: "🔗",
    category: "Gelistirici",
  },
]

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [shopifyUrl, setShopifyUrl] = useState("")

  const categories = Array.from(new Set(INTEGRATIONS.map((i) => i.category)))

  const filtered = INTEGRATIONS.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedCategory && i.category !== selectedCategory) return false
    return true
  })

  const handleConnect = async (integrationId: string) => {
    if (integrationId === "shopify") {
      setConfiguring("shopify")
      return
    }
    if (integrationId === "ctwa_ads") {
      window.open("https://business.facebook.com/latest/ad_center", "_blank")
      return
    }
    if (integrationId === "zapier") {
      window.open("https://zapier.com", "_blank")
      return
    }
    if (integrationId === "make") {
      window.open("https://make.com", "_blank")
      return
    }
    alert(`${integrationId} entegrasyonu yaklaşımda!`)
  }

  const saveShopifyConfig = async () => {
    if (!shopifyUrl || !user?.org_id) return
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", user.org_id)
      .single()

    await supabase
      .from("organizations")
      .update({
        settings: { ...org?.settings, shopify_store_url: shopifyUrl },
      })
      .eq("id", user.org_id)

    setConfiguring(null)
    alert("Shopify bağlandı!")
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-2">Entegrasyonlar</h2>
      <p className="text-dark-400 text-sm mb-6">E-ticaret, CRM, otomasyon ve daha fazlasini bağlayın</p>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Entegrasyon ara..."
          className="bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 w-64" />
        <div className="flex gap-2">
          <button onClick={() => setSelectedCategory(null)}
            className={`text-xs px-3 py-1.5 rounded-lg transition ${!selectedCategory ? "bg-brand-500/10 text-brand-400" : "bg-dark-800 text-dark-400 hover:text-white"}`}>
            Tumu
          </button>
          {categories.map((c) => (
            <button key={c} onClick={() => setSelectedCategory(c)}
              className={`text-xs px-3 py-1.5 rounded-lg transition ${selectedCategory === c ? "bg-brand-500/10 text-brand-400" : "bg-dark-800 text-dark-400 hover:text-white"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Shopify config modal */}
      {configuring === "shopify" && (
        <div className="bg-dark-900 border border-brand-500/30 rounded-xl p-6 mb-6">
          <h3 className="text-white font-medium mb-3">Shopify Entegrasyonu</h3>
          <p className="text-sm text-dark-400 mb-4">Magazanizin URL'sini girin. Sepet hatirlatma ve siparis bildirimleri otomatik aktif olacak.</p>
          <div className="flex gap-2">
            <input type="text" value={shopifyUrl} onChange={(e) => setShopifyUrl(e.target.value)}
              className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              placeholder="magazam.myshopify.com" />
            <button onClick={saveShopifyConfig}
              className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-4 py-2 rounded-lg text-sm transition">
              Bağla
            </button>
            <button onClick={() => setConfiguring(null)}
              className="bg-dark-800 text-dark-300 hover:text-white px-4 py-2 rounded-lg text-sm transition">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Entegrasyon listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => (
          <div key={integration.id} className="bg-dark-900 border border-dark-800 rounded-xl p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{integration.icon}</span>
              <div>
                <h3 className="text-white font-medium text-sm">{integration.name}</h3>
                <span className="text-[10px] text-dark-500">{integration.category}</span>
              </div>
            </div>
            <p className="text-xs text-dark-400 flex-1 mb-4">{integration.description}</p>
            <button onClick={() => handleConnect(integration.id)}
              className="w-full bg-dark-800 hover:bg-dark-700 text-white py-2 rounded-lg text-sm font-medium transition">
              Bağla
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
