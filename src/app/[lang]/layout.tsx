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

  const isNoLayoutPage = NO_LAYOUT_PAGES.some((p) => pathname.endsWith(p))

  // Aktif sayfanin grubunu otomatik ac
  useEffect(() => {
    if (collapsed) return
    const allNavItems = [
      { group: "DASHBOARD", items: [{ href: `/${lang}/` }] },
      { group: t("nav_messaging"), items: [
        { href: localePath("inbox", lang) }, { href: localePath("contacts", lang) },
        { href: localePath("templates", lang) }, { href: localePath("broadcast", lang) },
      ]},
      { group: t("nav_crm"), items: [
        { href: localePath("pipeline", lang) }, { href: localePath("leads", lang) },
        { href: localePath("companies", lang) }, { href: localePath("tasks", lang) },
      ]},
      { group: t("nav_ai"), items: [
        { href: localePath("chatbot", lang) }, { href: localePath("automation", lang) },
        { href: localePath("flow-builder", lang) },
      ]},
      { group: t("nav_integration"), items: [
        { href: localePath("channels", lang) }, { href: localePath("integrations", lang) },
        { href: localePath("web-forms", lang) }, { href: localePath("webhooks", lang) },
      ]},
      { group: t("nav_analytics"), items: [
        { href: localePath("analytics", lang) }, { href: localePath("activity-log", lang) },
      ]},
      { group: t("nav_account"), items: [
        { href: localePath("team", lang) }, { href: localePath("billing", lang) },
        { href: localePath("settings", lang) },
      ]},
    ]
    for (const nav of allNavItems) {
      if (nav.items.some((item) => pathname.startsWith(item.href))) {
        setOpenGroups((prev) => prev.includes(nav.group) ? prev : [...prev, nav.group])
        break
      }
    }
  }, [pathname, collapsed])

  useEffect(() => {
    const urlLang = params.lang as Lang
    if (urlLang && (urlLang === "tr" || urlLang === "en") && urlLang !== lang) {
      setLang(urlLang)
    }
  }, [params.lang])

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed")
    if (saved === "true") setCollapsed(true)
    setReady(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { setAnimate(true) })
    })
  }, [])

  useEffect(() => {
    if (ready) localStorage.setItem("sidebar_collapsed", String(collapsed))
  }, [collapsed, ready])

  useEffect(() => {
    if (!collapsed) return
    const runHint = () => {
      setHintPhase("logo")
      hintTimer.current = setTimeout(() => {
        setHintPhase("button")
        hintTimer.current = setTimeout(() => { runHint() }, 1000)
      }, 5000)
    }
    runHint()
    return () => { if (hintTimer.current) clearTimeout(hintTimer.current) }
  }, [collapsed])

  const toggleCollapsed = useCallback(() => { setCollapsed((p) => !p) }, [])
  const toggleGroup = useCallback((group: string) => {
    setOpenGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    )
  }, [])

  // ===== NAV ITEMS =====
  const NAV_ITEMS = [
    { group: t("nav_dashboard"), items: [
      { href: localePath("dashboard", lang), label: t("dashboard"), icon: <IconDashboard /> },
    ]},
    { group: t("nav_messaging"), items: [
      { href: localePath("inbox", lang), label: t("inbox"), icon: <IconInbox /> },
      { href: localePath("contacts", lang), label: t("nav_contacts"), icon: <IconContacts /> },
      { href: localePath("templates", lang), label: t("nav_templates"), icon: <IconTemplates /> },
      { href: localePath("broadcast", lang), label: t("nav_broadcast"), icon: <IconBroadcast /> },
    ]},
    { group: t("nav_crm"), items: [
      { href: localePath("pipeline", lang), label: t("nav_pipeline"), icon: <IconPipeline /> },
      { href: localePath("leads", lang), label: t("nav_leads"), icon: <IconLeads /> },
      { href: localePath("companies", lang), label: t("nav_companies"), icon: <IconCompany /> },
      { href: localePath("tasks", lang), label: t("nav_tasks"), icon: <IconTasks /> },
    ]},
    { group: t("nav_ai"), items: [
      { href: localePath("chatbot", lang), label: t("nav_chatbot"), icon: <IconBot />, badge: "AI" },
      { href: localePath("automation", lang), label: t("nav_automation"), icon: <IconAutomation /> },
      { href: localePath("flow-builder", lang), label: t("nav_flow_builder"), icon: <IconFlow /> },
    ]},
    { group: t("nav_integration"), items: [
      { href: localePath("channels", lang), label: t("nav_channels"), icon: <IconChannels /> },
      { href: localePath("integrations", lang), label: t("nav_integrations"), icon: <IconIntegration /> },
      { href: localePath("web-forms", lang), label: t("nav_web_forms"), icon: <IconForm /> },
      { href: localePath("webhooks", lang), label: t("nav_webhooks"), icon: <IconWebhook /> },
    ]},
    { group: t("nav_analytics"), items: [
      { href: localePath("analytics", lang), label: t("nav_reports"), icon: <IconAnalytics /> },
      { href: localePath("activity-log", lang), label: t("nav_activity_log"), icon: <IconActivity /> },
    ]},
    { group: t("nav_account"), items: [
      { href: localePath("team", lang), label: t("nav_team"), icon: <IconTeam /> },
      { href: localePath("billing", lang), label: t("nav_billing"), icon: <IconBilling /> },
      { href: localePath("settings", lang), label: t("nav_settings"), icon: <IconSettings /> },
    ]},
  ]

  // ===== AUTH CHECK =====
  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { router.push(`/${lang}/login`); return }
    if (!user) {
      api("/auth/me", { token })
        .then((u) => {
          const refresh = localStorage.getItem("refresh_token") || ""
          setAuth(u, token, refresh)
          setLoading(false)
        })
        .catch(() => { logout(); router.push(`/${lang}/login`) })
    } else { setLoading(false) }
  }, [user, router, setAuth, logout])

  if (isNoLayoutPage) return <>{children}</>

  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse-soft" />
          <span className="text-body text-ink-tertiary">{t("loading")}</span>
        </div>
      </div>
    )
  }

  const sidebarWidth = collapsed ? "w-[54px]" : "w-[220px]"

  return (
    <div className="h-screen bg-surface flex overflow-hidden">
      {/* ===== SIDEBAR (Kommo-compact) ===== */}
      <aside
        className={`${sidebarWidth} ${animate ? "transition-[width] duration-200 ease-out" : ""} bg-surface-100 border-r border-surface-300 flex flex-col shrink-0 overflow-hidden`}
      >
        {/* Logo */}
        <div className="px-3 py-3 flex items-center gap-2 border-b border-surface-200">
          {collapsed ? (
            <button onClick={toggleCollapsed} className="w-[30px] h-[30px] mx-auto flex items-center justify-center relative group">
              <div className={`w-[28px] h-[28px] rounded-btn overflow-hidden transition-opacity duration-300 ${hintPhase === "logo" ? "opacity-100" : "opacity-0"} group-hover:opacity-0`}>
                <img src="/logo.png" alt="YoChat" className="w-full h-full object-contain" />
              </div>
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${hintPhase === "button" ? "opacity-100" : "opacity-0"} group-hover:opacity-100`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-ink-tertiary">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          ) : (
            <>
              <div className="w-[28px] h-[28px] rounded-btn overflow-hidden shrink-0">
                <img src="/logo.png" alt="YoChat" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-body-medium text-ink leading-none">
                  Yo<span className="text-primary">Chat</span>
                </span>
              </div>
              <button onClick={toggleCollapsed} className="w-6 h-6 flex items-center justify-center text-ink-muted hover:text-ink rounded-btn transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto overflow-x-hidden no-scrollbar">
          {NAV_ITEMS.map((group, gi) => {
            const isOpen = openGroups.includes(group.group)
            const hasActiveItem = group.items.some((item) => pathname.startsWith(item.href))
            return (
              <div key={group.group} className={gi > 0 ? "mt-1" : ""}>
                {collapsed ? (
                  <div className="h-px bg-surface-200 mx-2 my-2" />
                ) : (
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-btn group"
                  >
                    <span className={`text-micro uppercase tracking-wider ${hasActiveItem ? "text-ink-secondary" : "text-ink-muted group-hover:text-ink-secondary"}`}>
                      {group.group}
                    </span>
                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                      className={`w-3 h-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""} ${hasActiveItem ? "text-ink-muted" : "text-surface-500 group-hover:text-ink-muted"}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}

                {(collapsed || isOpen) && (
                  <div className={`space-y-px ${collapsed ? "" : "mt-0.5 mb-1"}`}>
                    {group.items.map((item) => {
                      const active = pathname.startsWith(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={collapsed ? item.label : undefined}
                          className={`ds-nav-item ${collapsed ? "justify-center px-1.5 py-2" : "px-2 py-[6px]"} ${active ? "ds-nav-item-active" : "ds-nav-item-inactive"}`}
                        >
                          {active && !collapsed && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-primary rounded-r" />
                          )}
                          <span className={`w-[18px] h-[18px] shrink-0 flex items-center justify-center ${active ? "text-primary" : ""}`}>
                            {item.icon}
                          </span>
                          {!collapsed && (
                            <>
                              <span className="truncate">{item.label}</span>
                              {"badge" in item && item.badge && (
                                <span className="ml-auto ds-badge-ai text-[9px] px-1.5 py-px">{item.badge}</span>
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
        <div className="px-2 py-2 border-t border-surface-200">
          {collapsed ? (
            <div className="flex justify-center">
              <div className="w-[30px] h-[30px] rounded-avatar bg-primary text-white flex items-center justify-center text-micro" title={user?.full_name || undefined}>
                {user?.full_name?.charAt(0) || "U"}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-1.5 py-1">
              <div className="w-[30px] h-[30px] rounded-avatar bg-primary text-white flex items-center justify-center text-micro shrink-0">
                {user?.full_name?.charAt(0) || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ui font-bold text-ink truncate">{user?.full_name}</p>
                <p className="text-micro text-primary font-bold capitalize">{user?.org_plan === "trial" ? t("trial_plan") : user?.org_plan}</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header (Kommo-style: compact, 48px) */}
        <header className="h-[48px] border-b border-surface-300 bg-surface-100 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
            <span className="text-caption text-ink-tertiary">{t("wa_account")}</span>
            <span className="ds-badge-success text-[11px]">{t("wa_connected")}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const newLang = lang === "tr" ? "en" : "tr"
                setLang(newLang)
                const parts = pathname.split("/").filter(Boolean)
                if (parts.length >= 2) {
                  const currentSlug = parts[1]
                  const key = Object.entries(SLUG_MAP).find(([, m]) => m.tr === currentSlug || m.en === currentSlug)?.[0]
                  if (key) { router.push(localePath(key, newLang as Lang)); return }
                }
                router.push(`/${newLang}`)
              }}
              className="ds-btn-ghost ds-btn-sm gap-1"
            >
              <span className="text-sm">{lang === "tr" ? "\uD83C\uDDF9\uD83C\uDDF7" : "\uD83C\uDDEC\uD83C\uDDE7"}</span>
              <span>{lang === "tr" ? "TR" : "EN"}</span>
            </button>
            <button
              onClick={() => { logout(); router.push(`/${lang}/login`) }}
              className="ds-btn-ghost ds-btn-sm text-ink-muted hover:text-accent-red"
            >
              {t("logout")}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

/* ---- SVG Icons (18x18, strokeWidth 1.8) ---- */
function IconDashboard() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>)
}
function IconPipeline() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M3 3h5v18H3zM10 3h5v18h-5zM17 3h5v18h-5z" /></svg>)
}
function IconLeads() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>)
}
function IconCompany() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22V12h6v10" /><path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01" /></svg>)
}
function IconTasks() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>)
}
function IconForm() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 7h10M7 12h10M7 17h6" /></svg>)
}
function IconWebhook() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" /><circle cx="12" cy="6" r="3" /><path d="M12 9v4l-4 5M12 13l4 5" /></svg>)
}
function IconActivity() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>)
}
function IconTeam() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>)
}
function IconInbox() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>)
}
function IconContacts() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>)
}
function IconTemplates() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>)
}
function IconBroadcast() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>)
}
function IconBot() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><rect x="3" y="8" width="18" height="12" rx="2" /><path d="M12 8V4" /><circle cx="12" cy="3" r="1" /><circle cx="8" cy="14" r="1.5" fill="currentColor" /><circle cx="16" cy="14" r="1.5" fill="currentColor" /></svg>)
}
function IconAutomation() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>)
}
function IconAnalytics() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>)
}
function IconFlow() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M6 3v6M18 15v6M6 9a3 3 0 100 6 3 3 0 000-6zM18 9a3 3 0 100 6 3 3 0 000-6z" /><path d="M9 12h6" /></svg>)
}
function IconChannels() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>)
}
function IconIntegration() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M4 11a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4z" /><path d="M14 11a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" /><path d="M10 13h4" /><path d="M12 7v3" /><path d="M12 16v3" /></svg>)
}
function IconBilling() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><rect x="1" y="4" width="22" height="16" rx="2" /><path d="M1 10h22" /></svg>)
}
function IconSettings() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>)
}
