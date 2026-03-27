"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { useI18n, localePath, SLUG_MAP, type Lang } from "@/lib/i18n"

// Sidebar olmadan gosterilecek sayfalar
const NO_LAYOUT_PAGES = ["/login", "/register", "/privacy-policy", "/cookie-policy", "/terms-of-service", "/data-deletion"]

export default function LangLayout({ children, params }: { children: React.ReactNode; params: { lang: string } }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setAuth, logout } = useAuth()
  const { t, lang, setLang } = useI18n()
  const [loading, setLoading] = useState(true)

  // ===== SIDEBAR STATE =====
  const [collapsed, setCollapsed] = useState(false)
  const [ready, setReady] = useState(false)
  const [animate, setAnimate] = useState(false)
  const [openGroups, setOpenGroups] = useState<string[]>([])
  const [hintPhase, setHintPhase] = useState<"logo" | "button">("logo")
  const hintTimer = useRef<NodeJS.Timeout | null>(null)

  // Login, register ve legal sayfalarda sidebar gosterme
  const isNoLayoutPage = NO_LAYOUT_PAGES.some((p) => pathname.endsWith(p))
  if (isNoLayoutPage) {
    return <>{children}</>
  }

  // URL'deki dil parametresine göre i18n sync
  useEffect(() => {
    const urlLang = params.lang as Lang
    if (urlLang && (urlLang === "tr" || urlLang === "en") && urlLang !== lang) {
      setLang(urlLang)
    }
  }, [params.lang])

  // ===== HYDRATION FLASH ONLEME =====
  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed")
    if (saved === "true") setCollapsed(true)
    setReady(true)
    // Cift requestAnimationFrame ile transition'i geciktir
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setAnimate(true)
      })
    })
  }, [])

  // Collapsed state'i localStorage'a kaydet
  useEffect(() => {
    if (ready) localStorage.setItem("sidebar_collapsed", String(collapsed))
  }, [collapsed, ready])

  // ===== COLLAPSED HINT ANIMASYONU =====
  useEffect(() => {
    if (!collapsed) return
    const runHint = () => {
      setHintPhase("logo")
      hintTimer.current = setTimeout(() => {
        setHintPhase("button")
        hintTimer.current = setTimeout(() => {
          runHint()
        }, 1000)
      }, 5000)
    }
    runHint()
    return () => { if (hintTimer.current) clearTimeout(hintTimer.current) }
  }, [collapsed])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((p) => !p)
  }, [])

  const toggleGroup = useCallback((group: string) => {
    setOpenGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    )
  }, [])

  // ===== NAV ITEMS =====
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

  // ===== AUTH CHECK =====
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push(`/${lang}/login`)
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
          router.push(`/${lang}/login`)
        })
    } else {
      setLoading(false)
    }
  }, [user, router, setAuth, logout])

  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="animate-pulse text-brand-400 text-lg">{t("loading")}</div>
      </div>
    )
  }

  const sidebarWidth = collapsed ? "w-[72px]" : "w-[260px]"

  return (
    <div className="h-screen bg-dark-950 flex overflow-hidden">
      {/* ===== SIDEBAR ===== */}
      <aside
        className={`${sidebarWidth} ${animate ? "transition-[width] duration-300" : ""} bg-dark-900/80 backdrop-blur-sm border-r border-dark-800/60 flex flex-col shrink-0 overflow-hidden`}
      >
        {/* Logo + Toggle */}
        <div className="px-3 py-4 flex items-center gap-3 relative group">
          {collapsed ? (
            /* Collapsed: Logo with glow hint */
            <button
              onClick={toggleCollapsed}
              className="w-10 h-10 mx-auto relative flex items-center justify-center"
            >
              {/* Glow parcaciklari */}
              <div className={`absolute inset-0 transition-opacity duration-500 ${hintPhase === "logo" ? "opacity-100" : "opacity-0"} group-hover:opacity-0`}>
                <span className="absolute top-0 left-1 w-2 h-2 bg-emerald-400/40 rounded-full animate-ping" style={{ animationDuration: "1.6s" }} />
                <span className="absolute top-1 right-0 w-1.5 h-1.5 bg-emerald-500/30 rounded-full animate-ping" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
                <span className="absolute bottom-0 left-2 w-1.5 h-1.5 bg-emerald-300/30 rounded-full animate-ping" style={{ animationDuration: "1.8s", animationDelay: "0.6s" }} />
                <span className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-400/20 rounded-full animate-ping" style={{ animationDuration: "2.2s", animationDelay: "0.9s" }} />
              </div>
              {/* Logo */}
              <div className={`w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center ring-1 ring-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-opacity duration-500 ${hintPhase === "logo" ? "opacity-100" : "opacity-0"} group-hover:opacity-0`}>
                <span className="text-dark-950 font-bold text-sm">Y</span>
              </div>
              {/* "Ac" butonu */}
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${hintPhase === "button" ? "opacity-100" : "opacity-0"} group-hover:opacity-100`}>
                <div className="w-8 h-8 bg-dark-800 rounded-lg flex items-center justify-center border border-dark-700 hover:border-brand-500/50">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-dark-400">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            </button>
          ) : (
            /* Expanded: Logo + brand + close button */
            <>
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-dark-950 font-bold text-sm">Y</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold leading-none">
                  <span className="text-white">Yo</span>
                  <span className="text-brand-400">Chat</span>
                </h1>
              </div>
              <button
                onClick={toggleCollapsed}
                className="w-6 h-6 flex items-center justify-center text-dark-500 hover:text-white transition rounded"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 px-2 py-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((group) => {
            const isOpen = openGroups.includes(group.group) || !collapsed
            return (
              <div key={group.group} className="mb-3">
                {/* Grup basligi */}
                {collapsed ? (
                  <div className="h-px bg-dark-800/60 mx-2 my-2" />
                ) : (
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className="w-full flex items-center justify-between px-3 mb-1"
                  >
                    <p className="text-[10px] font-semibold text-dark-600 uppercase tracking-wider">
                      {group.group}
                    </p>
                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                      className={`w-3 h-3 text-dark-600 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}

                {/* Nav itemlari */}
                {(collapsed || isOpen) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = pathname.startsWith(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={`flex items-center gap-2.5 rounded-lg text-[13px] transition-all duration-150 relative ${
                            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2"
                          } ${
                            active
                              ? "bg-brand-500/10 text-brand-400 font-bold"
                              : "text-dark-400 hover:text-white hover:bg-dark-800/60"
                          }`}
                        >
                          {/* Aktif bar */}
                          {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-brand-400 rounded-r" />
                          )}
                          <span className={`w-4 h-4 shrink-0 ${active ? "text-brand-400" : "text-dark-500"}`}>
                            {item.icon}
                          </span>
                          {!collapsed && (
                            <>
                              <span className="truncate">{item.label}</span>
                              {"badge" in item && item.badge && (
                                <span className="ml-auto text-[9px] font-bold bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-2 py-3 border-t border-dark-800/60">
          {collapsed ? (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-dark-950 text-xs font-bold" title={user?.full_name}>
                {user?.full_name?.charAt(0) || "U"}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 px-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-dark-950 text-xs font-bold shrink-0">
                {user?.full_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.full_name}</p>
                <p className="text-[10px] text-brand-500 capitalize">{user?.org_plan === "trial" ? t("trial_plan") : user?.org_plan}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
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
              onClick={() => { logout(); router.push(`/${lang}/login`) }}
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
      <circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" /><circle cx="12" cy="6" r="3" />
      <path d="M12 9v4l-4 5M12 13l4 5" />
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
