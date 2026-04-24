"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
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

  // ===== USER MENU STATE =====
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [langSubmenuOpen, setLangSubmenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // ===== SIDEBAR TIP CARDS =====
  const [tipIndex, setTipIndex] = useState(0)
  const [tipVisible, setTipVisible] = useState(true)
  const [tipDismissed, setTipDismissed] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "loading">("loading")

  const isNoLayoutPage = NO_LAYOUT_PAGES.some((p) => pathname.endsWith(p))

  // Aktif sayfanin grubunu otomatik ac
  useEffect(() => {
    if (collapsed) return
    const allNavItems = [
      { group: t("nav_dashboard"), items: [{ href: localePath("dashboard", lang) }] },
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
        { href: localePath("knowledge-base", lang) }, { href: localePath("flow-builder", lang) },
      ]},
      { group: t("nav_integration"), items: [
        { href: localePath("channels", lang) }, { href: localePath("integrations", lang) },
        { href: localePath("web-forms", lang) }, { href: localePath("webhooks", lang) },
      ]},
      { group: t("nav_analytics"), items: [
        { href: localePath("analytics", lang) }, { href: localePath("activity-log", lang) },
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

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
        setLangSubmenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [userMenuOpen])

  const toggleCollapsed = useCallback(() => { setCollapsed((p) => !p) }, [])
  const toggleGroup = useCallback((group: string) => {
    setOpenGroups((prev) =>
      prev.includes(group) ? [] : [group]
    )
  }, [])

  const closeAllGroups = useCallback(() => {
    setOpenGroups([])
  }, [])

  // ===== NAV ITEMS =====
  const NAV_ITEMS = [
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
      { href: localePath("knowledge-base", lang), label: t("nav_knowledge_base"), icon: <IconKnowledgeBase />, badge: "AI" },
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
  ]

  // ===== AUTH CHECK =====
  useEffect(() => {
    if (isNoLayoutPage) return
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
  }, [user, router, setAuth, logout, isNoLayoutPage])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) return
    api<{ connected: boolean }>("/meta/status", { token })
      .then((data) => setConnectionStatus(data.connected ? "connected" : "disconnected"))
      .catch(() => setConnectionStatus("disconnected"))
  }, [pathname])

  // Tip cards data
  const tipCards = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-primary">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      titleTR: "Akıllı Gelen Kutusu",
      titleEN: "Smart Inbox",
      descTR: "WhatsApp, Instagram ve Facebook mesajlarınız tek ekranda. Müşterilerinize hangi kanaldan yazarsa yazsın, buradan anında yanıt verin. Okundu bilgisi, dosya paylaşımı ve AI destekli hızlı yanıtlar ile müşteri memnuniyetinizi artırın.",
      descEN: "All your WhatsApp, Instagram and Facebook messages in one screen. Reply instantly to your customers regardless of their channel. Boost satisfaction with read receipts, file sharing and AI-powered quick replies.",
      color: "#119d58",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-accent-violet">
          <path d="M12 2a4 4 0 014 4v2H8V6a4 4 0 014-4z" strokeLinecap="round"/>
          <rect x="3" y="8" width="18" height="12" rx="2" strokeLinecap="round"/>
          <circle cx="8.5" cy="14" r="1.5" fill="currentColor"/>
          <circle cx="15.5" cy="14" r="1.5" fill="currentColor"/>
          <path d="M9.5 17.5h5" strokeLinecap="round"/>
        </svg>
      ),
      titleTR: "AI Chatbot",
      titleEN: "AI Chatbot",
      descTR: "Bilgi Bankası'na ürün, hizmet ve fiyat bilgilerinizi ekleyin. AI chatbot 7/24 müşterilerinize doğru ve tutarlı yanıtlar versin. Mesai dışında bile müşteri kaybetmeyin, yapay zeka sizin yerinize çalışsın.",
      descEN: "Add your products, services and prices to the Knowledge Base. Let AI chatbot answer your customers accurately 24/7. Never lose customers outside business hours — AI works for you.",
      color: "#8B5CF6",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-accent-blue">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      titleTR: "CRM & Pipeline",
      titleEN: "CRM & Pipeline",
      descTR: "Müşteri adaylarınızı Kanban tahtasında sürükle-bırak ile yönetin. Her lead'in hangi aşamada olduğunu görün, teklif değerlerini takip edin. Kişi ve şirket bağlayarak satış sürecinizi uçtan uca kontrol edin.",
      descEN: "Manage your leads on a Kanban board with drag-and-drop. See which stage each lead is at, track deal values. Link contacts and companies to control your entire sales process end-to-end.",
      color: "#3B82F6",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-accent-yellow">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      titleTR: "Toplu Mesaj Gönderimi",
      titleEN: "Broadcast Messages",
      descTR: "Onaylanmış WhatsApp şablonlarıyla binlerce müşterinize tek tıkla kişiselleştirilmiş mesajlar gönderin. Etiket bazlı filtreleme ile doğru kitleye ulaşın. Gönderim, teslim ve okunma oranlarını anlık takip edin.",
      descEN: "Send personalized messages to thousands of customers with approved WhatsApp templates. Reach the right audience with tag-based filtering. Track send, delivery and read rates in real-time.",
      color: "#F59E0B",
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-[#0EA5E9]">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9" strokeLinecap="round"/>
        </svg>
      ),
      titleTR: "Analiz & Raporlar",
      titleEN: "Analytics & Reports",
      descTR: "Mesajlaşma performansınızı detaylı grafiklerle görün. Gelen-giden mesaj sayıları, bot çözüm oranı, kampanya başarısı ve kanal bazlı karşılaştırmalar ile veriye dayalı kararlar alın ve işinizi büyütün.",
      descEN: "View your messaging performance with detailed charts. Make data-driven decisions with incoming-outgoing message counts, bot resolution rates, campaign success and channel comparisons to grow your business.",
      color: "#0EA5E9",
    },
  ]

  // Tip card auto-rotation
  useEffect(() => {
    if (tipDismissed || collapsed) return
    const interval = setInterval(() => {
      setTipVisible(false)
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % tipCards.length)
        setTipVisible(true)
      }, 400)
    }, 5000)
    return () => clearInterval(interval)
  }, [tipDismissed, collapsed, tipCards.length])

  if (isNoLayoutPage) return <>{children}</>

  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          {/* YoAi Logo */}
          <img
            src="/logo.png"
            alt="YoAi"
            className="h-14 w-auto"
            style={{
              animation: "float-logo 2s ease-in-out infinite",
            }}
          />
          {/* Bouncing dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-primary"
                style={{
                  animation: "bounce-dot 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.16}s`,
                }}
              />
            ))}
          </div>
          <span className="text-caption text-ink-tertiary">{t("loading")}</span>
          <style>{`
            @keyframes bounce-dot {
              0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
              40% { transform: scale(1); opacity: 1; }
            }
            @keyframes float-logo {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-8px); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-surface flex overflow-hidden">
      {/* ===== SIDEBAR (Kommo-compact) ===== */}
      <aside
        className={`${animate ? "transition-[width] duration-300 ease-in-out" : ""} bg-sidebar shadow-sidebar flex flex-col shrink-0 overflow-hidden`}
        style={{ width: collapsed ? "54px" : "220px" }}
      >
        {/* Logo */}
        <div className="px-3 py-3.5 flex items-center gap-2 border-b border-sidebar-border min-h-[54px]">
          {collapsed ? (
            <div className="group relative flex items-center justify-center w-full h-9 rounded-lg overflow-hidden">
              {/* Ping particles on hint */}
              <div className={`absolute inset-0 transition-opacity duration-500 pointer-events-none ${hintPhase === "button" ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
                <span className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" style={{ animationDuration: "1.5s" }} />
                <span className="absolute top-0 right-2 w-1 h-1 rounded-full bg-emerald-300 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.3s" }} />
                <span className="absolute bottom-1 left-3 w-1 h-1 rounded-full bg-emerald-500 animate-ping" style={{ animationDuration: "1.8s", animationDelay: "0.5s" }} />
                <span className="absolute bottom-0 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" style={{ animationDuration: "1.6s", animationDelay: "0.2s" }} />
                <div className="absolute inset-0 rounded-lg ring-1 ring-emerald-400/40 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
              </div>
              {/* Logo */}
              <a href={`/${lang}/panel`}
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-0 ${hintPhase === "button" ? "opacity-0" : "opacity-100"}`}
                onClick={(e) => e.stopPropagation()}
              >
                <img src="/logo.png" alt="YO Dijital" className="w-[28px] h-[28px] object-contain invert" />
              </a>
              {/* Expand button */}
              <button
                onClick={toggleCollapsed}
                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 group-hover:opacity-100 rounded-lg ${hintPhase === "button" ? "opacity-100" : "opacity-0"}`}
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-5 h-5 text-emerald-400" />
              </button>
            </div>
          ) : (
            <>
              <a href={`/${lang}/panel`} className="w-[28px] h-[28px] rounded-btn overflow-hidden shrink-0 hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="YO Dijital" className="w-full h-full object-contain invert" />
              </a>
              <div className="flex-1 min-w-0" />
              <button onClick={toggleCollapsed} className="p-1.5 text-sidebar-text hover:text-white hover:bg-sidebar-hover rounded-lg transition-colors" aria-label="Collapse sidebar">
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto overflow-x-hidden no-scrollbar">
          {NAV_ITEMS.map((group, gi) => {
            const isOpen = openGroups.includes(group.group)
            const hasActiveItem = group.items.some((item) => pathname.startsWith(item.href))
            return (
              <div key={group.group} className={gi > 0 ? "mt-1.5" : ""}>
                {collapsed ? (
                  <div className="h-px bg-sidebar-border mx-2 my-2" />
                ) : (
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-btn group"
                  >
                    <span className={`text-micro uppercase tracking-wider ${hasActiveItem ? "text-sidebar-text-active" : "text-sidebar-text group-hover:text-sidebar-text-active"}`}>
                      {group.group}
                    </span>
                    <svg
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                      className={`w-3 h-3 transition-transform duration-150 ${isOpen ? "rotate-180" : ""} text-sidebar-text`}
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
                          className={`ds-nav-item ${collapsed ? "justify-center px-1.5 py-2" : "px-2.5 py-[7px]"} ${active ? "ds-nav-item-active" : "ds-nav-item-inactive"}`}
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
                                <span className="ml-auto bg-primary/15 text-primary text-[9px] px-1.5 py-px rounded-badge font-semibold">{item.badge}</span>
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

        {/* Tip Cards */}
        {!collapsed && !tipDismissed && (
          <div className="px-2.5 pb-2 shrink-0">
            <div
              className="relative rounded-card-sm overflow-hidden transition-all duration-400"
              style={{
                background: `linear-gradient(135deg, ${tipCards[tipIndex].color}18, ${tipCards[tipIndex].color}08)`,
                border: `1px solid ${tipCards[tipIndex].color}25`,
              }}
            >
              {/* Close button */}
              <button
                onClick={() => setTipDismissed(true)}
                className="absolute top-1.5 right-1.5 w-5 h-5 flex items-center justify-center rounded-full text-sidebar-text hover:text-white hover:bg-white/10 transition-colors z-10"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Card content */}
              <div
                className="p-3 transition-all duration-400"
                style={{
                  opacity: tipVisible ? 1 : 0,
                  transform: tipVisible ? "translateY(0)" : "translateY(8px)",
                }}
              >
                {/* Icon with glow */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-2.5"
                  style={{ background: `${tipCards[tipIndex].color}20` }}
                >
                  {tipCards[tipIndex].icon}
                </div>

                {/* Text */}
                <h4 className="text-white text-[13px] font-semibold mb-1 leading-tight">
                  {lang === "tr" ? tipCards[tipIndex].titleTR : tipCards[tipIndex].titleEN}
                </h4>
                <p className="text-sidebar-text text-[11px] leading-relaxed">
                  {lang === "tr" ? tipCards[tipIndex].descTR : tipCards[tipIndex].descEN}
                </p>

                {/* Progress dots */}
                <div className="flex items-center gap-1.5 mt-3">
                  {tipCards.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setTipVisible(false); setTimeout(() => { setTipIndex(i); setTipVisible(true) }, 300) }}
                      className="relative h-1.5 rounded-full transition-all duration-300 overflow-hidden"
                      style={{
                        width: i === tipIndex ? 20 : 8,
                        background: i === tipIndex ? "transparent" : "rgba(255,255,255,0.2)",
                      }}
                    >
                      {i === tipIndex && (
                        <>
                          <div className="absolute inset-0 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
                          <div
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: tipCards[tipIndex].color,
                              animation: "tip-progress 5s linear forwards",
                              transformOrigin: "left",
                            }}
                          />
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <style>{`
              @keyframes tip-progress {
                from { transform: scaleX(0); }
                to { transform: scaleX(1); }
              }
            `}</style>
          </div>
        )}

        {/* User Menu */}
        <div ref={userMenuRef} className="px-2 py-2.5 border-t border-sidebar-border relative">
          {/* Trigger */}
          <button
            onClick={() => { setUserMenuOpen((v) => !v); setLangSubmenuOpen(false) }}
            className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2.5 px-1.5 py-1.5 rounded-lg hover:bg-sidebar-hover transition-colors`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-[32px] h-[32px] rounded-avatar bg-primary text-primary-deep flex items-center justify-center text-micro font-semibold shrink-0" title={user?.full_name || undefined}>
                {user?.full_name?.charAt(0) || "U"}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-ui font-semibold text-white truncate">{user?.full_name}</p>
                  <p className="text-micro text-primary font-semibold capitalize">{user?.org_plan === "trial" ? t("trial_plan") : user?.org_plan}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 text-sidebar-text/50 shrink-0 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            )}
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div className={`absolute z-50 border border-white/[0.08] rounded-xl shadow-2xl py-1 w-56 ${collapsed ? "left-full ml-2 bottom-0" : "bottom-full mb-2 left-0"}`} style={{ background: "linear-gradient(160deg, #131a12, #0c1210)" }}>
              {/* Header info */}
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-primary font-medium capitalize mt-0.5">{user?.org_plan === "trial" ? t("trial_plan") : user?.org_plan}</p>
              </div>

              {/* Nav links */}
              <div className="py-1">
                {[
                  { label: t("nav_settings"), href: localePath("settings", lang), icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  )},
                  { label: t("nav_billing"), href: localePath("billing", lang), icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
                  )},
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              {/* Language submenu */}
              <div className="border-t border-white/[0.08] py-1">
                <button
                  onClick={() => setLangSubmenuOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-200 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-400"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                    <span>{lang === "tr" ? "Dil" : "Language"}</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 text-gray-400 transition-transform ${langSubmenuOpen ? "rotate-90" : ""}`}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
                {langSubmenuOpen && (
                  <div className="ml-7 py-0.5">
                    {(["tr", "en"] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setLang(l)
                          setUserMenuOpen(false)
                          setLangSubmenuOpen(false)
                          const parts = pathname.split("/").filter(Boolean)
                          if (parts.length >= 2) {
                            const currentSlug = parts[1]
                            const key = Object.entries(SLUG_MAP).find(([, m]) => m.tr === currentSlug || m.en === currentSlug)?.[0]
                            if (key) { router.push(localePath(key, l as Lang)); return }
                          }
                          router.push(`/${l}`)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                      >
                        {lang === l && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-primary">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                        <span className={lang === l ? "text-primary font-medium" : ""}>{l === "tr" ? "🇹🇷 Türkçe" : "🇬🇧 English"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Logout */}
              <div className="border-t border-white/[0.08] py-1">
                <button
                  onClick={() => { logout(); router.push(`/${lang}/login`) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  <span>{t("logout")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-[52px] border-b border-surface-300 bg-white flex items-center px-5 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === "connected" ? "bg-primary animate-pulse-soft" : connectionStatus === "loading" ? "bg-gray-300 animate-pulse" : "bg-red-400"}`} />
            <span className="text-caption text-ink-tertiary">{t("wa_account")}</span>
            {connectionStatus === "loading" ? (
              <span className="ds-badge-neutral text-[11px]">...</span>
            ) : connectionStatus === "connected" ? (
              <span className="ds-badge-success text-[11px]">{t("wa_connected")}</span>
            ) : (
              <span className="ds-badge-danger text-[11px]">{t("wa_disconnected")}</span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto" onClick={closeAllGroups}>{children}</main>
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
function IconKnowledgeBase() {
  return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /><path d="M8 7h8M8 11h5" /></svg>)
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
