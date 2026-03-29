"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { useI18n } from "@/lib/i18n"

/* ───────────────────── Wizard Adımı Tipi ───────────────────── */
interface WizardStep {
  title: string
  description: string
  fields?: { key: string; label: string; placeholder: string; type: "text" | "password" | "url" }[]
  instructions?: string[]
  externalUrl?: string
  externalLabel?: string
}

/* ───────────────────── Entegrasyon Tanımı ───────────────────── */
interface IntegrationDef {
  id: string
  name: string
  logo: string
  categoryKey: string
  descKey: string
  steps: WizardStep[]
  settingsKeys: string[]
}

/* ───────────────────── Platform Tanımları ───────────────────── */
const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "shopify", name: "Shopify", logo: "/icons/integrations/shopify.svg",
    categoryKey: "e_commerce", descKey: "shopify_desc",
    settingsKeys: ["shopify_store_url"],
    steps: [
      {
        title: "Shopify Mağaza Bilgileri",
        description: "Shopify mağazanızın URL adresini girin.",
        fields: [
          { key: "shopify_store_url", label: "Mağaza URL", placeholder: "magazam.myshopify.com", type: "url" },
        ],
      },
      {
        title: "Shopify Webhook Ayarları",
        description: "Shopify admin panelinizden aşağıdaki webhook'ları ekleyin.",
        instructions: [
          "Shopify Admin > Settings > Notifications > Webhooks bölümüne gidin",
          "\"Create webhook\" butonuna tıklayın",
          "Event: \"Order creation\" seçin",
          "Format: JSON, URL: webhook URL'nizi yapıştırın",
          "Aynı işlemi \"Cart update\" ve \"Checkout update\" için tekrarlayın",
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "Shopify entegrasyonu başarıyla kuruldu. Sipariş bildirimleri ve sepet hatırlatmaları aktif.",
        instructions: [
          "Yeni siparişler otomatik bildirim olarak gelecek",
          "Terk edilen sepet hatırlatmaları WhatsApp'tan gönderilecek",
          "Kargo durumu güncellemeleri müşteriye iletilecek",
        ],
      },
    ],
  },
  {
    id: "woocommerce", name: "WooCommerce", logo: "/icons/integrations/woocommerce.svg",
    categoryKey: "e_commerce", descKey: "woocommerce_desc",
    settingsKeys: ["woocommerce_url", "woocommerce_consumer_key", "woocommerce_consumer_secret"],
    steps: [
      {
        title: "WooCommerce API Anahtarları",
        description: "WordPress yönetim panelinizden WooCommerce REST API anahtarlarını oluşturun.",
        instructions: [
          "WordPress Admin > WooCommerce > Ayarlar > Gelişmiş > REST API bölümüne gidin",
          "\"Anahtar ekle\" butonuna tıklayın",
          "Açıklama: \"WhatsApp Entegrasyonu\" yazın",
          "İzinler: \"Okuma/Yazma\" seçin",
          "\"API Anahtarı Oluştur\" butonuna tıklayın",
          "Consumer Key ve Consumer Secret bilgilerini kopyalayın",
        ],
      },
      {
        title: "Bağlantı Bilgileri",
        description: "Mağaza URL'nizi ve API anahtarlarınızı girin.",
        fields: [
          { key: "woocommerce_url", label: "Mağaza URL", placeholder: "https://magazam.com", type: "url" },
          { key: "woocommerce_consumer_key", label: "Consumer Key", placeholder: "ck_xxxxxxxxxxxxxxxx", type: "password" },
          { key: "woocommerce_consumer_secret", label: "Consumer Secret", placeholder: "cs_xxxxxxxxxxxxxxxx", type: "password" },
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "WooCommerce entegrasyonu başarıyla kuruldu.",
        instructions: [
          "Yeni siparişler WhatsApp üzerinden bildirilecek",
          "Sipariş durumu değişiklikleri müşteriye iletilecek",
          "Stok uyarıları aktif edildi",
        ],
      },
    ],
  },
  {
    id: "stripe", name: "Stripe", logo: "/icons/integrations/stripe.svg",
    categoryKey: "payment", descKey: "stripe_desc",
    settingsKeys: ["stripe_api_key", "stripe_webhook_secret"],
    steps: [
      {
        title: "Stripe API Anahtarı",
        description: "Stripe Dashboard'dan API anahtarınızı alın.",
        instructions: [
          "Stripe Dashboard > Developers > API Keys bölümüne gidin",
          "\"Secret key\" altındaki anahtarı kopyalayın (sk_live_... veya sk_test_...)",
          "Test modunda çalışmak istiyorsanız test anahtarını kullanabilirsiniz",
        ],
        externalUrl: "https://dashboard.stripe.com/apikeys",
        externalLabel: "Stripe Dashboard'u Aç",
      },
      {
        title: "API Bilgilerini Girin",
        description: "Stripe API anahtarınızı buraya yapıştırın.",
        fields: [
          { key: "stripe_api_key", label: "Secret API Key", placeholder: "sk_live_xxxxxxxxxxxxxxxx", type: "password" },
          { key: "stripe_webhook_secret", label: "Webhook Secret (opsiyonel)", placeholder: "whsec_xxxxxxxx", type: "password" },
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "Stripe entegrasyonu başarıyla kuruldu.",
        instructions: [
          "Ödeme bildirimleri WhatsApp üzerinden gönderilecek",
          "Başarılı/başarısız ödeme durumları takip edilecek",
          "Fatura bilgileri otomatik iletilecek",
        ],
      },
    ],
  },
  {
    id: "iyzico", name: "Iyzico", logo: "/icons/integrations/iyzico.svg",
    categoryKey: "payment", descKey: "iyzico_desc",
    settingsKeys: ["iyzico_api_key", "iyzico_secret_key"],
    steps: [
      {
        title: "Iyzico API Bilgileri",
        description: "Iyzico merchant panelinizden API bilgilerinizi alın.",
        instructions: [
          "Iyzico Merchant Panel > Ayarlar > API Anahtarları bölümüne gidin",
          "API Key ve Secret Key bilgilerini kopyalayın",
          "Sandbox ortamı için sandbox anahtarlarını kullanabilirsiniz",
        ],
        externalUrl: "https://merchant.iyzipay.com",
        externalLabel: "Iyzico Panel'i Aç",
      },
      {
        title: "API Bilgilerini Girin",
        description: "Iyzico API ve Secret Key bilgilerinizi girin.",
        fields: [
          { key: "iyzico_api_key", label: "API Key", placeholder: "sandbox-xxxxxxxxxxxxxxxx", type: "text" },
          { key: "iyzico_secret_key", label: "Secret Key", placeholder: "sandbox-xxxxxxxxxxxxxxxx", type: "password" },
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "Iyzico entegrasyonu başarıyla kuruldu.",
        instructions: [
          "Türkiye'deki ödeme bildirimleri aktif",
          "Ödeme onayları WhatsApp'tan gönderilecek",
          "Taksit ve ödeme planı bilgileri iletilecek",
        ],
      },
    ],
  },
  {
    id: "hubspot", name: "HubSpot", logo: "/icons/integrations/hubspot.svg",
    categoryKey: "crm", descKey: "hubspot_desc",
    settingsKeys: ["hubspot_api_key"],
    steps: [
      {
        title: "HubSpot API Anahtarı",
        description: "HubSpot hesabınızdan Private App oluşturup API anahtarı alın.",
        instructions: [
          "HubSpot > Settings > Integrations > Private Apps bölümüne gidin",
          "\"Create a private app\" butonuna tıklayın",
          "Uygulama adı: \"WhatsApp Integration\" yazın",
          "Scopes sekmesinde: crm.objects.contacts (Read/Write) seçin",
          "\"Create app\" ile oluşturun ve Access Token'ı kopyalayın",
        ],
        externalUrl: "https://app.hubspot.com/settings",
        externalLabel: "HubSpot Ayarlarını Aç",
      },
      {
        title: "API Anahtarını Girin",
        description: "HubSpot Private App Access Token bilgisini girin.",
        fields: [
          { key: "hubspot_api_key", label: "Access Token", placeholder: "pat-na1-xxxxxxxx-xxxx-xxxx", type: "password" },
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "HubSpot CRM entegrasyonu başarıyla kuruldu.",
        instructions: [
          "WhatsApp kişileri otomatik olarak HubSpot'a senkronize edilecek",
          "Yeni lead'ler CRM'de otomatik oluşturulacak",
          "Mesaj geçmişi HubSpot timeline'ında görünecek",
        ],
      },
    ],
  },
  {
    id: "salesforce", name: "Salesforce", logo: "/icons/integrations/salesforce.svg",
    categoryKey: "crm", descKey: "salesforce_desc",
    settingsKeys: ["salesforce_instance_url", "salesforce_access_token"],
    steps: [
      {
        title: "Salesforce Connected App",
        description: "Salesforce'da Connected App oluşturup OAuth bilgilerini alın.",
        instructions: [
          "Salesforce Setup > App Manager > New Connected App",
          "Connected App Name: \"WhatsApp Integration\" yazın",
          "Enable OAuth Settings'i işaretleyin",
          "Scopes: \"Manage user data via APIs (api)\" ekleyin",
          "Save edip Consumer Key ve Secret'ı kopyalayın",
        ],
        externalUrl: "https://login.salesforce.com",
        externalLabel: "Salesforce'a Giriş Yap",
      },
      {
        title: "Bağlantı Bilgileri",
        description: "Salesforce instance URL ve Access Token bilgilerinizi girin.",
        fields: [
          { key: "salesforce_instance_url", label: "Instance URL", placeholder: "https://mycompany.my.salesforce.com", type: "url" },
          { key: "salesforce_access_token", label: "Access Token", placeholder: "00Dxxxxxxxxxxxxxxx!xxxxxxx", type: "password" },
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "Salesforce CRM entegrasyonu başarıyla kuruldu.",
        instructions: [
          "WhatsApp kişileri Salesforce Lead/Contact olarak senkronize edilecek",
          "Mesaj aktiviteleri Salesforce'a kaydedilecek",
          "Pipeline güncellemeleri otomatik yapılacak",
        ],
      },
    ],
  },
  {
    id: "zapier", name: "Zapier", logo: "/icons/integrations/zapier.svg",
    categoryKey: "automation_cat", descKey: "zapier_desc",
    settingsKeys: ["zapier_webhook_url"],
    steps: [
      {
        title: "Zapier Zap Oluştur",
        description: "Zapier'da yeni bir Zap oluşturup Webhook trigger ekleyin.",
        instructions: [
          "Zapier'a giriş yapın ve \"Create Zap\" butonuna tıklayın",
          "Trigger olarak \"Webhooks by Zapier\" seçin",
          "Event: \"Catch Hook\" seçin",
          "Size verilen webhook URL'yi kopyalayın",
          "Action olarak istediğiniz uygulamayı seçin (Gmail, Slack, vb.)",
        ],
        externalUrl: "https://zapier.com/app/zaps/create",
        externalLabel: "Zapier'da Zap Oluştur",
      },
      {
        title: "Webhook URL Girin",
        description: "Zapier'ın size verdiği webhook URL'yi buraya yapıştırın.",
        fields: [
          { key: "zapier_webhook_url", label: "Zapier Webhook URL", placeholder: "https://hooks.zapier.com/hooks/catch/xxxxxx/xxxxxx/", type: "url" },
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "Zapier entegrasyonu başarıyla kuruldu.",
        instructions: [
          "WhatsApp mesajları Zapier'a otomatik gönderilecek",
          "5000+ uygulama ile otomasyon kurabilirsiniz",
          "Zapier Dashboard'dan akışlarınızı yönetin",
        ],
      },
    ],
  },
  {
    id: "make", name: "Make (Integromat)", logo: "/icons/integrations/make.svg",
    categoryKey: "automation_cat", descKey: "make_desc",
    settingsKeys: ["make_webhook_url"],
    steps: [
      {
        title: "Make Senaryosu Oluştur",
        description: "Make'de yeni bir senaryo oluşturup Webhook modülü ekleyin.",
        instructions: [
          "Make'e giriş yapın ve \"Create a new scenario\" butonuna tıklayın",
          "İlk modül olarak \"Webhooks\" > \"Custom webhook\" seçin",
          "\"Add\" ile yeni webhook oluşturun, isim verin",
          "Oluşan webhook URL'yi kopyalayın",
          "Sonraki modül olarak istediğiniz aksiyonu ekleyin",
        ],
        externalUrl: "https://www.make.com/en/login",
        externalLabel: "Make'e Giriş Yap",
      },
      {
        title: "Webhook URL Girin",
        description: "Make'in size verdiği webhook URL'yi buraya yapıştırın.",
        fields: [
          { key: "make_webhook_url", label: "Make Webhook URL", placeholder: "https://hook.make.com/xxxxxxxxxxxxxxx", type: "url" },
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "Make entegrasyonu başarıyla kuruldu.",
        instructions: [
          "WhatsApp mesajları Make senaryonuza otomatik gönderilecek",
          "Gelişmiş otomasyon akışları kurabilirsiniz",
          "Make Dashboard'dan senaryolarınızı yönetin",
        ],
      },
    ],
  },
  {
    id: "n8n", name: "n8n", logo: "/icons/integrations/n8n.svg",
    categoryKey: "automation_cat", descKey: "n8n_desc",
    settingsKeys: ["n8n_url", "n8n_api_key"],
    steps: [
      {
        title: "n8n Instance Bilgileri",
        description: "n8n kurulumunuzun URL ve API bilgilerini alın.",
        instructions: [
          "n8n instance'ınıza giriş yapın",
          "Settings > API > API Keys bölümüne gidin",
          "\"Create an API key\" ile yeni anahtar oluşturun",
          "Oluşan API key'i kopyalayın",
        ],
      },
      {
        title: "Bağlantı Bilgileri",
        description: "n8n instance URL ve API anahtarınızı girin.",
        fields: [
          { key: "n8n_url", label: "n8n Instance URL", placeholder: "https://n8n.sirketiniz.com", type: "url" },
          { key: "n8n_api_key", label: "API Key", placeholder: "n8n_api_xxxxxxxxxxxxxxxx", type: "password" },
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "n8n entegrasyonu başarıyla kuruldu.",
        instructions: [
          "WhatsApp mesajları n8n workflow'larınıza otomatik gönderilecek",
          "Açık kaynak ve kendi sunucunuzda çalışır",
          "n8n Dashboard'dan workflow'larınızı yönetin",
        ],
      },
    ],
  },
  {
    id: "google_sheets", name: "Google Sheets", logo: "/icons/integrations/google-sheets.svg",
    categoryKey: "productivity", descKey: "gsheets_desc",
    settingsKeys: ["google_sheets_id"],
    steps: [
      {
        title: "Google Sheets Hazırlığı",
        description: "Veri aktarımı için bir Google Sheets tablosu hazırlayın.",
        instructions: [
          "Google Sheets'te yeni bir tablo oluşturun veya mevcut bir tabloyu açın",
          "İlk satıra sütun başlıkları ekleyin: İsim, Telefon, Mesaj, Tarih",
          "Tablonun URL'sinden Spreadsheet ID'yi kopyalayın",
          "ID, URL'deki /d/ ile /edit arasındaki uzun karakter dizisidir",
          "Örnek: docs.google.com/spreadsheets/d/[BU_KISIM_ID]/edit",
        ],
        externalUrl: "https://sheets.google.com",
        externalLabel: "Google Sheets'i Aç",
      },
      {
        title: "Spreadsheet ID Girin",
        description: "Google Sheets tablo ID'nizi buraya yapıştırın.",
        fields: [
          { key: "google_sheets_id", label: "Spreadsheet ID", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms", type: "text" },
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "Google Sheets entegrasyonu başarıyla kuruldu.",
        instructions: [
          "Kişi bilgileri otomatik olarak tabloya aktarılacak",
          "Yeni mesajlar gerçek zamanlı kaydedilecek",
          "Veri dışa aktarma raporları hazırlanacak",
        ],
      },
    ],
  },
  {
    id: "google_calendar", name: "Google Calendar", logo: "/icons/integrations/google-calendar.svg",
    categoryKey: "productivity", descKey: "gcalendar_desc",
    settingsKeys: ["google_calendar_id"],
    steps: [
      {
        title: "Google Calendar Hazırlığı",
        description: "Randevu yönetimi için Google Calendar'ınızı yapılandırın.",
        instructions: [
          "Google Calendar'ı açın",
          "Sol panelde kullanmak istediğiniz takvimin yanındaki üç noktaya tıklayın",
          "\"Ayarlar ve paylaşım\" seçin",
          "\"Takvim entegrasyonu\" bölümünden Takvim ID'sini kopyalayın",
          "Genellikle e-posta adresiniz formatındadır (ornek@gmail.com)",
        ],
        externalUrl: "https://calendar.google.com/calendar/r/settings",
        externalLabel: "Google Calendar Ayarlarını Aç",
      },
      {
        title: "Calendar ID Girin",
        description: "Google Calendar ID'nizi buraya yapıştırın.",
        fields: [
          { key: "google_calendar_id", label: "Calendar ID", placeholder: "ornek@gmail.com", type: "text" },
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "Google Calendar entegrasyonu başarıyla kuruldu.",
        instructions: [
          "WhatsApp'tan gelen randevu talepleri takvime eklenecek",
          "Randevu hatırlatmaları otomatik gönderilecek",
          "Takvim güncellemeleri müşteriye iletilecek",
        ],
      },
    ],
  },
  {
    id: "ctwa_ads", name: "Click-to-WhatsApp Ads", logo: "/icons/integrations/ctwa-ads.svg",
    categoryKey: "marketing", descKey: "ctwa_desc",
    settingsKeys: ["ctwa_configured"],
    steps: [
      {
        title: "Facebook/Instagram Reklam Kurulumu",
        description: "Meta Ads Manager'dan Click-to-WhatsApp reklamı oluşturun.",
        instructions: [
          "Meta Business Suite > Ads Manager'ı açın",
          "Yeni kampanya oluşturun, hedef: \"Mesaj\" seçin",
          "Mesaj hedefi: \"WhatsApp\" seçin",
          "Reklam formatını seçin (resim, video, carousel)",
          "WhatsApp Business numaranızı seçin",
          "Bütçe ve hedef kitle belirleyip yayınlayın",
        ],
        externalUrl: "https://business.facebook.com/latest/ad_center/create",
        externalLabel: "Meta Ads Manager'ı Aç",
      },
      {
        title: "Lead Takibi",
        description: "Reklamlardan gelen lead'lerin otomatik olarak takip edilmesi için ayarları yapın.",
        instructions: [
          "Reklamdan gelen mesajlar otomatik olarak \"Reklam\" etiketi ile işaretlenecek",
          "Her lead CRM pipeline'ına otomatik eklenecek",
          "AI chatbot reklamdan gelen kişilere özel karşılama mesajı gönderecek",
          "Lead kaynak takibi Meta Ads kampanya adına göre yapılacak",
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "Click-to-WhatsApp Ads entegrasyonu başarıyla kuruldu.",
        instructions: [
          "Facebook/Instagram reklamlarından gelen mesajlar otomatik takip edilecek",
          "Lead'ler CRM'e otomatik eklenecek",
          "Reklam performansı dashboard'dan izlenebilir",
        ],
      },
    ],
  },
  {
    id: "webhook", name: "Custom Webhook", logo: "/icons/integrations/webhook.svg",
    categoryKey: "developer", descKey: "webhook_desc",
    settingsKeys: ["custom_webhook_url", "custom_webhook_secret"],
    steps: [
      {
        title: "Webhook Yapılandırması",
        description: "Mesaj olaylarını almak istediğiniz endpoint bilgilerini girin.",
        fields: [
          { key: "custom_webhook_url", label: "Webhook URL", placeholder: "https://api.sirketiniz.com/webhook", type: "url" },
          { key: "custom_webhook_secret", label: "Secret Key (opsiyonel)", placeholder: "webhook_secret_key", type: "password" },
        ],
      },
      {
        title: "Olay Türleri",
        description: "Webhook'unuza gönderilecek olay türleri hakkında bilgi.",
        instructions: [
          "message.received — Yeni mesaj geldiğinde",
          "message.sent — Mesaj gönderildiğinde",
          "contact.created — Yeni kişi oluşturulduğunda",
          "conversation.updated — Konuşma durumu değiştiğinde",
          "Her istek JSON formatında, HMAC-SHA256 imzalı olarak gönderilir",
          "Secret Key belirlerseniz X-Webhook-Signature header'ı eklenir",
        ],
      },
      {
        title: "Bağlantı Tamamlandı",
        description: "Custom Webhook entegrasyonu başarıyla kuruldu.",
        instructions: [
          "Seçilen olaylar belirttiğiniz URL'ye POST edilecek",
          "Her istekte retry mekanizması aktif (3 deneme)",
          "Webhook teslim logları panelden takip edilebilir",
        ],
      },
    ],
  },
]

/* ───────────────────── Ana Sayfa Bileşeni ───────────────────── */
export default function IntegrationsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Wizard state
  const [activeWizard, setActiveWizard] = useState<IntegrationDef | null>(null)
  const [wizardStep, setWizardStep] = useState(0)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [connectedIntegrations, setConnectedIntegrations] = useState<Record<string, boolean>>({})

  const categoryKeys = Array.from(new Set(INTEGRATIONS.map((i) => i.categoryKey)))

  // Bağlı entegrasyonları yükle
  useEffect(() => {
    if (!user?.org_id) return
    const load = async () => {
      const { data: org } = await supabase
        .from("organizations")
        .select("settings")
        .eq("id", user.org_id)
        .single()
      if (!org?.settings) return
      const connected: Record<string, boolean> = {}
      for (const integ of INTEGRATIONS) {
        if (integ.settingsKeys.length > 0 && org.settings[integ.settingsKeys[0]]) {
          connected[integ.id] = true
        }
      }
      setConnectedIntegrations(connected)
    }
    load()
  }, [user?.org_id])

  const filtered = INTEGRATIONS.filter((i) => {
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    if (selectedCategory && i.categoryKey !== selectedCategory) return false
    return true
  })

  // Wizard aç
  const openWizard = (integration: IntegrationDef) => {
    setActiveWizard(integration)
    setWizardStep(0)
    setFieldValues({})
  }

  // Wizard kapat
  const closeWizard = () => {
    setActiveWizard(null)
    setWizardStep(0)
    setFieldValues({})
  }

  // Mevcut adımda field var mı ve hepsi doldurulmuş mu
  const currentStepValid = useCallback(() => {
    if (!activeWizard) return false
    const step = activeWizard.steps[wizardStep]
    if (!step.fields) return true
    return step.fields.every((f) => fieldValues[f.key]?.trim())
  }, [activeWizard, wizardStep, fieldValues])

  // Sonraki adım veya kaydet
  const handleNext = async () => {
    if (!activeWizard) return
    const isLastStep = wizardStep === activeWizard.steps.length - 1
    const isSecondToLast = wizardStep === activeWizard.steps.length - 2

    // Son adımdaysa kapat
    if (isLastStep) {
      closeWizard()
      return
    }

    // Son adımdan bir öncekse kaydet
    if (isSecondToLast && user?.org_id) {
      // Tüm adımlardan toplanan field'ları kaydet
      const allFields: Record<string, string> = {}
      let hasFields = false
      for (const step of activeWizard.steps) {
        if (step.fields) {
          for (const field of step.fields) {
            if (fieldValues[field.key]?.trim()) {
              allFields[field.key] = fieldValues[field.key].trim()
              hasFields = true
            }
          }
        }
      }

      // CTWA Ads gibi field'sız entegrasyonlar için flag kaydet
      if (!hasFields && activeWizard.settingsKeys.length > 0) {
        allFields[activeWizard.settingsKeys[0]] = "true"
      }

      if (Object.keys(allFields).length > 0) {
        setSaving(true)
        try {
          const { data: org } = await supabase
            .from("organizations")
            .select("settings")
            .eq("id", user.org_id)
            .single()

          await supabase
            .from("organizations")
            .update({ settings: { ...org?.settings, ...allFields } })
            .eq("id", user.org_id)

          setConnectedIntegrations((prev) => ({ ...prev, [activeWizard.id]: true }))
        } finally {
          setSaving(false)
        }
      }
    }

    setWizardStep((s) => s + 1)
  }

  // Bağlantıyı kes
  const handleDisconnect = async (integration: IntegrationDef) => {
    if (!user?.org_id) return
    const { data: org } = await supabase
      .from("organizations")
      .select("settings")
      .eq("id", user.org_id)
      .single()

    const updated = { ...org?.settings }
    for (const key of integration.settingsKeys) {
      delete updated[key]
    }

    await supabase
      .from("organizations")
      .update({ settings: updated })
      .eq("id", user.org_id)

    setConnectedIntegrations((prev) => ({ ...prev, [integration.id]: false }))
  }

  const currentStep = activeWizard ? activeWizard.steps[wizardStep] : null
  const isLastStep = activeWizard ? wizardStep === activeWizard.steps.length - 1 : false

  return (
    <div className="p-7">
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("integrations")}</h2>
          <p className="ds-page-subtitle">{t("integrations_desc")}</p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={t("search_integration")}
          className="ds-input w-64" />
        <div className="flex gap-2 flex-wrap">
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

      {/* ─── WIZARD MODAL ─── */}
      {activeWizard && currentStep && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) closeWizard() }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

            {/* Wizard Header */}
            <div className="flex items-center gap-3 p-6 border-b border-gray-200 dark:border-gray-700">
              <Image src={activeWizard.logo} alt={activeWizard.name} width={40} height={40} className="rounded-xl" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{activeWizard.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t(activeWizard.descKey)}</p>
              </div>
              <button onClick={closeWizard} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none p-1">&times;</button>
            </div>

            {/* Stepper */}
            <div className="flex items-center px-6 pt-5 pb-2 gap-2">
              {activeWizard.steps.map((_, idx) => (
                <div key={idx} className="flex items-center flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    idx < wizardStep
                      ? "bg-emerald-500 text-white"
                      : idx === wizardStep
                      ? "bg-primary-500 text-white ring-4 ring-primary-500/20"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }`}>
                    {idx < wizardStep ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {idx < activeWizard.steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 transition-all ${idx < wizardStep ? "bg-emerald-500" : "bg-gray-200 dark:bg-gray-700"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            <div className="p-6">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">{currentStep.title}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{currentStep.description}</p>

              {/* Talimatlar */}
              {currentStep.instructions && (
                <div className="space-y-2.5 mb-5">
                  {currentStep.instructions.map((inst, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isLastStep
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                          : "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                      }`}>
                        {isLastStep ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 leading-relaxed">{inst}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Harici link */}
              {currentStep.externalUrl && (
                <a href={currentStep.externalUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline mb-5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  {currentStep.externalLabel}
                </a>
              )}

              {/* Form alanları */}
              {currentStep.fields && (
                <div className="space-y-4 mb-2">
                  {currentStep.fields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{field.label}</label>
                      <input
                        type={field.type === "password" ? "password" : "text"}
                        value={fieldValues[field.key] || ""}
                        onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="ds-input w-full"
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button onClick={wizardStep > 0 ? () => setWizardStep((s) => s - 1) : closeWizard}
                className="ds-btn-secondary px-5">
                {wizardStep > 0 ? t("back") : t("cancel")}
              </button>
              <button
                onClick={handleNext}
                disabled={!currentStepValid() || saving}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isLastStep
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                    : "ds-btn-primary"
                } ${(!currentStepValid() || saving) ? "opacity-50 cursor-not-allowed" : ""}`}>
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"/></svg>
                    {t("saving")}
                  </span>
                ) : isLastStep ? (
                  t("done")
                ) : (
                  t("next_step")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ENTEGRASYON KARTLARI ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => {
          const isConnected = connectedIntegrations[integration.id]
          return (
            <div key={integration.id}
              className={`ds-card p-5 flex flex-col transition-all hover:shadow-lg ${isConnected ? "border-emerald-200 dark:border-emerald-800" : ""}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800 p-1.5">
                  <Image src={integration.logo} alt={integration.name} width={36} height={36} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-body-medium font-medium">{integration.name}</h3>
                    {isConnected && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {t("connected")}
                      </span>
                    )}
                  </div>
                  <span className="text-micro text-ink-tertiary">{t(integration.categoryKey)}</span>
                </div>
              </div>
              <p className="text-caption text-ink-secondary flex-1 mb-4">{t(integration.descKey)}</p>
              {isConnected ? (
                <div className="flex gap-2">
                  <button onClick={() => openWizard(integration)}
                    className="flex-1 ds-btn-secondary text-sm">
                    {t("settings")}
                  </button>
                  <button onClick={() => handleDisconnect(integration)}
                    className="ds-btn-secondary text-sm text-red-500 hover:text-red-600 hover:border-red-300 dark:hover:border-red-700">
                    {t("disconnect")}
                  </button>
                </div>
              ) : (
                <button onClick={() => openWizard(integration)}
                  className="w-full ds-btn-primary text-sm py-2.5">
                  {t("connect")}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
