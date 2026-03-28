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
    { id: "shopify", name: "Shopify", descKey: "shopify_desc", icon: "\uD83D\uDECD", categoryKey: "e_commerce" },
    { id: "woocommerce", name: "WooCommerce", descKey: "woocommerce_desc", icon: "\uD83D\uDED2", categoryKey: "e_commerce" },
    { id: "stripe", name: "Stripe", descKey: "stripe_desc", icon: "\uD83D\uDCB3", categoryKey: "payment" },
    { id: "iyzico", name: "Iyzico", descKey: "iyzico_desc", icon: "\uD83C\uDFE6", categoryKey: "payment" },
    { id: "hubspot", name: "HubSpot", descKey: "hubspot_desc", icon: "\uD83D\uDD36", categoryKey: "crm" },
    { id: "salesforce", name: "Salesforce", descKey: "salesforce_desc", icon: "\u2601\uFE0F", categoryKey: "crm" },
    { id: "zapier", name: "Zapier", descKey: "zapier_desc", icon: "\u26A1", categoryKey: "automation_cat" },
    { id: "make", name: "Make (Integromat)", descKey: "make_desc", icon: "\uD83D\uDD04", categoryKey: "automation_cat" },
    { id: "google_sheets", name: "Google Sheets", descKey: "gsheets_desc", icon: "\uD83D\uDCCA", categoryKey: "productivity" },
    { id: "google_calendar", name: "Google Calendar", descKey: "gcalendar_desc", icon: "\uD83D\uDCC5", categoryKey: "productivity" },
    { id: "ctwa_ads", name: "Click-to-WhatsApp Ads", descKey: "ctwa_desc", icon: "\uD83D\uDCE2", categoryKey: "marketing" },
    { id: "webhook", name: "Custom Webhook", descKey: "webhook_desc", icon: "\uD83D\uDD17", categoryKey: "developer" },
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
    <div className="p-7">
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("integrations")}</h2>
          <p className="ds-page-subtitle">{t("integrations_desc")}</p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-6">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search_integration")}
          className="ds-input w-64" />
        <div className="flex gap-2">
          <button onClick={() => setSelectedCategory(null)}
            className={`text-micro px-3 py-1.5 rounded-badge transition ${!selectedCategory ? "ds-chip-active" : "ds-chip"}`}>
            {t("all")}
          </button>
          {categoryKeys.map((c) => (
            <button key={c} onClick={() => setSelectedCategory(c)}
              className={`text-micro px-3 py-1.5 rounded-badge transition ${selectedCategory === c ? "ds-chip-active" : "ds-chip"}`}>
              {t(c)}
            </button>
          ))}
        </div>
      </div>

      {/* Shopify config modal */}
      {configuring === "shopify" && (
        <div className="ds-card border-primary/30 p-6 mb-6">
          <h3 className="ds-section-title mb-3">{t("shopify_setup")}</h3>
          <p className="text-caption text-ink-secondary mb-4">{t("shopify_setup_desc")}</p>
          <div className="flex gap-2">
            <input type="text" value={shopifyUrl} onChange={(e) => setShopifyUrl(e.target.value)}
              className="ds-input flex-1"
              placeholder="magazam.myshopify.com" />
            <button onClick={saveShopifyConfig}
              className="ds-btn-primary">
              {t("connect")}
            </button>
            <button onClick={() => setConfiguring(null)}
              className="ds-btn-secondary">
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Entegrasyon listesi */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => (
          <div key={integration.id} className="ds-card p-5 flex flex-col">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{integration.icon}</span>
              <div>
                <h3 className="text-body-medium font-medium">{integration.name}</h3>
                <span className="text-micro text-ink-tertiary">{t(integration.categoryKey)}</span>
              </div>
            </div>
            <p className="text-caption text-ink-secondary flex-1 mb-4">{t(integration.descKey)}</p>
            <button onClick={() => handleConnect(integration.id)}
              className="w-full ds-btn-secondary">
              {t("connect")}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
