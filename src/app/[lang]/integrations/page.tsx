"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { useI18n } from "@/lib/i18n"

interface Integration {
  id: string
  name: string
  descKey: string
  icon: string
  categoryKey: string
  connected: boolean
  config?: Record<string, string>
}

export default function IntegrationsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [shopifyUrl, setShopifyUrl] = useState("")

  const INTEGRATIONS = [
    { id: "shopify", name: "Shopify", descKey: "shopify_desc", icon: "🛍", categoryKey: "e_commerce" },
    { id: "woocommerce", name: "WooCommerce", descKey: "woocommerce_desc", icon: "🛒", categoryKey: "e_commerce" },
    { id: "stripe", name: "Stripe", descKey: "stripe_desc", icon: "💳", categoryKey: "payment" },
    { id: "iyzico", name: "Iyzico", descKey: "iyzico_desc", icon: "🏦", categoryKey: "payment" },
    { id: "hubspot", name: "HubSpot", descKey: "hubspot_desc", icon: "🔶", categoryKey: "crm" },
    { id: "salesforce", name: "Salesforce", descKey: "salesforce_desc", icon: "☁️", categoryKey: "crm" },
    { id: "zapier", name: "Zapier", descKey: "zapier_desc", icon: "⚡", categoryKey: "automation_cat" },
    { id: "make", name: "Make (Integromat)", descKey: "make_desc", icon: "🔄", categoryKey: "automation_cat" },
    { id: "google_sheets", name: "Google Sheets", descKey: "gsheets_desc", icon: "📊", categoryKey: "productivity" },
    { id: "google_calendar", name: "Google Calendar", descKey: "gcalendar_desc", icon: "📅", categoryKey: "productivity" },
    { id: "ctwa_ads", name: "Click-to-WhatsApp Ads", descKey: "ctwa_desc", icon: "📢", categoryKey: "marketing" },
    { id: "webhook", name: "Custom Webhook", descKey: "webhook_desc", icon: "🔗", categoryKey: "developer" },
  ]

  const categoryKeys = Array.from(new Set(INTEGRATIONS.map((i) => i.categoryKey)))

  const filtered = INTEGRATIONS.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedCategory && i.categoryKey !== selectedCategory) return false
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
    alert(`${integrationId} ${t("coming_soon")}`)
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
    alert(t("shopify_connected"))
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-2">{t("integrations")}</h2>
      <p className="text-dark-400 text-sm mb-6">{t("integrations_desc")}</p>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search_integration")}
          className="bg-dark-800 border border-dark-700 rounded-lg px-4 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 w-64" />
        <div className="flex gap-2">
          <button onClick={() => setSelectedCategory(null)}
            className={`text-xs px-3 py-1.5 rounded-lg transition ${!selectedCategory ? "bg-brand-500/10 text-brand-400" : "bg-dark-800 text-dark-400 hover:text-white"}`}>
            {t("all")}
          </button>
          {categoryKeys.map((c) => (
            <button key={c} onClick={() => setSelectedCategory(c)}
              className={`text-xs px-3 py-1.5 rounded-lg transition ${selectedCategory === c ? "bg-brand-500/10 text-brand-400" : "bg-dark-800 text-dark-400 hover:text-white"}`}>
              {t(c)}
            </button>
          ))}
        </div>
      </div>

      {/* Shopify config modal */}
      {configuring === "shopify" && (
        <div className="bg-dark-900 border border-brand-500/30 rounded-xl p-6 mb-6">
          <h3 className="text-white font-medium mb-3">{t("shopify_setup")}</h3>
          <p className="text-sm text-dark-400 mb-4">{t("shopify_setup_desc")}</p>
          <div className="flex gap-2">
            <input type="text" value={shopifyUrl} onChange={(e) => setShopifyUrl(e.target.value)}
              className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              placeholder="magazam.myshopify.com" />
            <button onClick={saveShopifyConfig}
              className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-4 py-2 rounded-lg text-sm transition">
              {t("connect")}
            </button>
            <button onClick={() => setConfiguring(null)}
              className="bg-dark-800 text-dark-300 hover:text-white px-4 py-2 rounded-lg text-sm transition">
              {t("cancel")}
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
                <span className="text-[10px] text-dark-500">{t(integration.categoryKey)}</span>
              </div>
            </div>
            <p className="text-xs text-dark-400 flex-1 mb-4">{t(integration.descKey)}</p>
            <button onClick={() => handleConnect(integration.id)}
              className="w-full bg-dark-800 hover:bg-dark-700 text-white py-2 rounded-lg text-sm font-medium transition">
              {t("connect")}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
