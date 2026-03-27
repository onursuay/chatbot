"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { useI18n, localePath, SLUG_MAP, type Lang } from "@/lib/i18n"

export default function LangLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setAuth, logout } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [loading, setLoading] = useState(true)

  // URL'deki dil parametresine göre i18n sync
  useEffect(() => {
    const urlLang = params.lang as Lang
    if (urlLang && (urlLang === "tr" || urlLang === "en") && urlLang !== lang) {
      setLang(urlLang)
    }
  }, [params.lang])

  const NAV_ITEMS = [
    {
      group: t("nav_dashboard"),
      items: [
        { href: localePath("dashboard", lang), label: t("dashboard"), icon: <IconDashboard /> },
      ],
    },
    {
      group: t("nav_messaging"),
      items: [
        { href: localePath("inbox", lang), label: t("inbox"), icon: <IconInbox /> },
        { href: localePath("contacts", lang), label: t("nav_contacts"), icon: <IconContacts /> },
        { href: localePath("templates", lang), label: t("nav_templates"), icon: <IconTemplates /> },
        { href: localePath("broadcast", lang), label: t("nav_broadcast"), icon: <IconBroadcast /> },
      ],
    },
    {
      group: t("nav_crm"),
      items: [
        { href: localePath("pipeline", lang), label: t("nav_pipeline"), icon: <IconPipeline /> },
        { href: localePath("leads", lang), label: t("nav_leads"), icon: <IconLeads /> },
        { href: localePath("companies", lang), label: t("nav_companies"), icon: <IconCompany /> },
        { href: localePath("tasks", lang), label: t("nav_tasks"), icon: <IconTasks /> },
      ],
    },
    {
      group: t("nav_ai"),
      items: [
        { href: localePath("chatbot", lang), label: t("nav_chatbot"), icon: <IconBot />, badge: "AI" },
        { href: localePath("automation", lang), label: t("nav_automation"), icon: <IconAutomation /> },
        { href: localePath("flow-builder", lang), label: t("nav_flow_builder"), icon: <IconFlow /> },
      ],
    },
    {
      group: t("nav_integration"),
      items: [
        { href: localePath("channels", lang), label: t("nav_channels"), icon: <IconChannels /> },
        { href: localePath("integrations", lang), label: t("nav_integrations"), icon: <IconIntegration /> },
        { href: localePath("web-forms", lang), label: t("nav_web_forms"), icon: <IconForm /> },
        { href: localePath("webhooks", lang), label: t("nav_webhooks"), icon: <IconWebhook /> },
      ],
    },
    {
      group: t("nav_analytics"),
      items: [
        { href: localePath("analytics", lang), label: t("nav_reports"), icon: <IconAnalytics /> },
        { href: localePath("activity-log", lang), label: t("nav_activity_log"), icon: <IconActivity /> },
      ],
    },
    {
      group: t("nav_account"),
      items: [
        { href: localePath("team", lang), label: t("nav_team"), icon: <IconTeam /> },
        { href: localePath("billing", lang), label: t("nav_billing"), icon: <IconBilling /> },
        { href: localePath("settings", lang), label: t("nav_settings"), icon: <IconSettings /> },
      ],
    },
  ]

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/auth/login")
      return
    }
    if (!user) {
      api("/auth/me", { token })
        .then((u) => {
          const refresh = localStorage.getItem("refresh_token") || ""
          setAuth(u, token, refresh)
          setLoading(false)
        })
        .catch(() => {
          logout()
          router.push("/auth/login")
        })
    } else {
      setLoading(false)
    }
  }, [user, router, setAuth, logout])

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-pulse text-brand-400 text-lg">{t("loading")}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Sidebar */}
      <aside className="w-[220px] bg-dark-900/80 backdrop-blur-sm border-r border-dark-800/60 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-dark-950 font-bold text-sm">Y</span>
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">
              <span className="text-white">Yo</span>
              <span className="text-brand-400">Chat</span>
            </h1>
          </div>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {NAV_ITEMS.map((group) => (
            <div key={group.group} className="mb-4">
              <p className="text-[10px] font-semibold text-dark-600 uppercase tracking-wider px-3 mb-1.5">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                        active
                          ? "bg-brand-500/10 text-brand-400"
                          : "text-dark-400 hover:text-white hover:bg-dark-800/60"
                      }`}
                    >
                      <span className={`w-4 h-4 ${active ? "text-brand-400" : "text-dark-500"}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                      {"badge" in item && item.badge && (
                        <span className="ml-auto text-[9px] font-bold bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-dark-800/60">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-dark-950 text-xs font-bold shrink-0">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-[10px] text-brand-500 capitalize">{user?.org_plan === "trial" ? t("trial_plan") : user?.org_plan}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-12 border-b border-dark-800/60 bg-dark-900/40 backdrop-blur-sm flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span className="text-xs text-dark-400">{t("wa_account")}</span>
            <span className="text-xs font-medium text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">{t("wa_connected")}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const newLang = lang === "tr" ? "en" : "tr"
                setLang(newLang)
                // URL'deki slug'ı yeni dile çevir
                const parts = pathname.split("/").filter(Boolean)
                if (parts.length >= 2) {
                  const currentSlug = parts[1]
                  const key = Object.entries(SLUG_MAP).find(([, m]) => m.tr === currentSlug || m.en === currentSlug)?.[0]
                  if (key) {
                    router.push(localePath(key, newLang as Lang))
                    return
                  }
                }
                router.push(`/${newLang}`)
              }}
              className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-white bg-dark-800/60 px-2.5 py-1.5 rounded-lg transition"
            >
              <span>{lang === "tr" ? "\uD83C\uDDF9\uD83C\uDDF7" : "\uD83C\uDDEC\uD83C\uDDE7"}</span>
              <span>{lang === "tr" ? "TR" : "EN"}</span>
            </button>
            <button
              onClick={() => { logout(); router.push("/auth/login") }}
              className="text-xs text-dark-500 hover:text-red-400 transition"
            >
              {t("logout")}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}

/* ---- SVG Icons ---- */
function IconDashboard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconPipeline() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M3 3h5v18H3zM10 3h5v18h-5zM17 3h5v18h-5z" />
    </svg>
  )
}
function IconLeads() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
function IconCompany() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01" />
    </svg>
  )
}
function IconTasks() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  )
}
function IconForm() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h10M7 12h10M7 17h6" />
    </svg>
  )
}
function IconWebhook() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 012 17c.01-.7.2-1.4.57-2" /><path d="M6 17a4 4 0 014-4h.01" /><path d="M14 13.98h4a2 2 0 012 2v0a2 2 0 01-2 2" /><circle cx="12" cy="6" r="4" />
    </svg>
  )
}
function IconActivity() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
function IconTeam() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}
function IconInbox() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}
function IconContacts() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  )
}
function IconTemplates() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" />
    </svg>
  )
}
function IconBroadcast() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}
function IconBot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <rect x="3" y="8" width="18" height="12" rx="2" /><path d="M12 8V4" /><circle cx="12" cy="3" r="1" /><circle cx="8" cy="14" r="1.5" fill="currentColor" /><circle cx="16" cy="14" r="1.5" fill="currentColor" />
    </svg>
  )
}
function IconAutomation() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}
function IconAnalytics() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
    </svg>
  )
}
function IconFlow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M6 3v6M18 15v6M6 9a3 3 0 100 6 3 3 0 000-6zM18 9a3 3 0 100 6 3 3 0 000-6z" /><path d="M9 12h6" />
    </svg>
  )
}
function IconChannels() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  )
}
function IconIntegration() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path d="M4 11a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" /><path d="M14 11a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /><path d="M10 13h4" /><path d="M12 7v3" /><path d="M12 16v3" />
    </svg>
  )
}
function IconBilling() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  )
}
