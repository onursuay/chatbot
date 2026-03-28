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
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{t("integrations")}</h2>
      <p className="text-gray-500 text-sm mb-6">{t("integrations_desc")}</p>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search_integration")}
          className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary w-64" />
        <div className="flex gap-2">
          <button onClick={() => setSelectedCategory(null)}
            className={`text-xs px-3 py-1.5 rounded-lg transition ${!selectedCategory ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}>
            {t("all")}
          </button>
          {categoryKeys.map((c) => (
            <button key={c} onClick={() => setSelectedCategory(c)}
              className={`text-xs px-3 py-1.5 rounded-lg transition ${selectedCategory === c ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500 hover:text-gray-900"}`}>
              {t(c)}
            </button>
          ))}
        </div>
      </div>

      {/* Shopify config modal */}
      {configuring === "shopify" && (
        <div className="bg-white border border-primary/30 rounded-xl p-6 mb-6">
          <h3 className="text-gray-900 font-medium mb-3">{t("shopify_setup")}</h3>
          <p className="text-sm text-gray-500 mb-4">{t("shopify_setup_desc")}</p>
          <div className="flex gap-2">
            <input type="text" value={shopifyUrl} onChange={(e) => setShopifyUrl(e.target.value)}
              className="flex-1 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
              placeholder="magazam.myshopify.com" />
            <button onClick={saveShopifyConfig}
              className="bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm transition">
              {t("connect")}
            </button>
            <button onClick={() => setConfiguring(null)}
              className="bg-gray-100 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition">
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Entegrasyon listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => (
          <div key={integration.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{integration.icon}</span>
              <div>
                <h3 className="text-gray-900 font-medium text-sm">{integration.name}</h3>
                <span className="text-[10px] text-gray-400">{t(integration.categoryKey)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 flex-1 mb-4">{t(integration.descKey)}</p>
            <button onClick={() => handleConnect(integration.id)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-2 rounded-lg text-sm font-medium transition">
              {t("connect")}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
