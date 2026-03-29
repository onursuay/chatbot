"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setAuth, logout } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [loading, setLoading] = useState(true)

  const NAV_ITEMS = [
    {
      group: t("nav_messaging"),
      items: [
        { href: "/dashboard/inbox", label: t("inbox"), icon: <IconInbox /> },
        { href: "/dashboard/contacts", label: t("nav_contacts"), icon: <IconContacts /> },
        { href: "/dashboard/templates", label: t("nav_templates"), icon: <IconTemplates /> },
        { href: "/dashboard/broadcast", label: t("nav_broadcast"), icon: <IconBroadcast /> },
      ],
    },
    {
      group: t("nav_ai"),
      items: [
        { href: "/dashboard/chatbot", label: t("nav_chatbot"), icon: <IconBot />, badge: "AI" },
        { href: "/dashboard/automation", label: t("nav_automation"), icon: <IconAutomation /> },
        { href: "/dashboard/flow-builder", label: t("nav_flow_builder"), icon: <IconFlow /> },
      ],
    },
    {
      group: t("nav_integration"),
      items: [
        { href: "/dashboard/channels", label: t("nav_channels"), icon: <IconChannels /> },
        { href: "/dashboard/integrations", label: t("nav_integrations"), icon: <IconIntegration /> },
      ],
    },
    {
      group: t("nav_analytics"),
      items: [
        { href: "/dashboard/analytics", label: t("nav_reports"), icon: <IconAnalytics /> },
      ],
    },
    {
      group: t("nav_account"),
      items: [
        { href: "/dashboard/billing", label: t("nav_billing"), icon: <IconBilling /> },
        { href: "/dashboard/settings", label: t("nav_settings"), icon: <IconSettings /> },
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
              onClick={() => setLang(lang === "tr" ? "en" : "tr")}
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
