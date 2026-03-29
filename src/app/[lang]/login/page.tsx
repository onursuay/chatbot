"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n, localePath, type Lang } from "@/lib/i18n"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { setAuth } = useAuth()
  const { lang, t, setLang } = useI18n()

  useEffect(() => {
    const urlLang = (params.lang as string) || "tr"
    if (urlLang !== lang && (urlLang === "tr" || urlLang === "en")) {
      setLang(urlLang as Lang)
    }
  }, [params.lang])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const tokens = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
      const user = await api("/auth/me", { token: tokens.access_token })
      setAuth(user, tokens.access_token, tokens.refresh_token)
      router.push(localePath("inbox", lang))
    } catch (err: any) {
      setError(err.message || (lang === "tr" ? "Giriş başarısız" : "Login failed"))
    } finally {
      setLoading(false)
    }
  }

  const isTR = lang === "tr"

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 flex flex-col">
      {/* Header */}
      <header className="px-8 py-5 flex items-center max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo-yo.png" alt="YO Dijital" width={44} height={44} />
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-emerald-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[1080px] flex items-center gap-20">

          {/* Left - Branding (desktop) */}
          <div className="hidden lg:flex flex-col flex-1 max-w-[500px]">
            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">
              {isTR
                ? "Müşterilerinizle iletişimi güçlendirin"
                : "Empower your customer communication"}
            </h1>
            <p className="text-gray-500 text-base leading-relaxed mb-8">
              {isTR
                ? "Mesajlaşma, CRM ve yapay zeka bir arada! Tüm kanallarınızı tek platformda yönetin."
                : "Messaging, CRM and AI combined! Manage all your channels in one platform."}
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                  titleTR: "Çoklu Kanal Mesajlaşma",
                  titleEN: "Omni-Channel Messaging",
                  descTR: "WhatsApp, Instagram, Facebook tek ekrandan",
                  descEN: "WhatsApp, Instagram, Facebook in one screen",
                  color: "text-emerald-600",
                  bg: "bg-emerald-50",
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ),
                  titleTR: "CRM & Pipeline",
                  titleEN: "CRM & Pipeline",
                  descTR: "Müşteri yönetimi ve satış takibi",
                  descEN: "Customer management and sales tracking",
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.5}>
                      <rect x="3" y="8" width="18" height="12" rx="2"/>
                      <path d="M12 8V4M8 8V6M16 8V6" strokeLinecap="round"/>
                      <circle cx="8.5" cy="14" r="1.5" fill="currentColor"/>
                      <circle cx="15.5" cy="14" r="1.5" fill="currentColor"/>
                    </svg>
                  ),
                  titleTR: "AI Chatbot & Otomasyon",
                  titleEN: "AI Chatbot & Automation",
                  descTR: "Yapay zeka destekli otomatik yanıtlar",
                  descEN: "AI-powered automatic responses",
                  color: "text-violet-600",
                  bg: "bg-violet-50",
                },
              ].map((f, i) => (
                <div key={i} className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-lg ${f.bg} ${f.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{isTR ? f.titleTR : f.titleEN}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{isTR ? f.descTR : f.descEN}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                {isTR ? "Kredi kartı gerekmez" : "No credit card required"}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                {isTR ? "14 gün ücretsiz" : "14 days free"}
              </div>
            </div>
          </div>

          {/* Right - Login Card */}
          <div className="w-full max-w-[460px] mx-auto lg:mx-0">
            {/* Mobile logo */}
            <div className="text-center mb-6 lg:hidden">
              <Image src="/logo-yo.png" alt="YO Dijital" width={48} height={48} className="mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                {isTR ? "Hesabınıza giriş yapın" : "Sign in to your account"}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xl shadow-gray-200/40 p-10">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {isTR ? "Giriş Yap" : "Sign In"}
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                {isTR ? "Hesabınıza giriş yaparak devam edin" : "Continue by signing in to your account"}
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {isTR ? "E-posta" : "Email"}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                    placeholder={isTR ? "örnek@sirket.com" : "example@company.com"}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {isTR ? "Şifre" : "Password"}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                    placeholder="********"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl py-3 transition-all duration-200 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loading
                    ? (isTR ? "Giriş yapılıyor..." : "Signing in...")
                    : (isTR ? "Giriş Yap" : "Sign In")}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400">{isTR ? "veya" : "or"}</span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500">
                {isTR ? "Hesabınız yok mu? " : "Don't have an account? "}
                <Link href={`/${lang}/register`} className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                  {isTR ? "Ücretsiz Başlayın" : "Start Free"}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-gray-400">© 2024-2026 YO Dijital. {isTR ? "Tüm hakları saklıdır." : "All rights reserved."}</span>
          <div className="flex items-center gap-4">
            <a href={`/${lang}/privacy-policy`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">{t("footer_privacy")}</a>
            <a href={`/${lang}/cookie-policy`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">{t("footer_cookie")}</a>
            <a href={`/${lang}/terms-of-service`} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">{t("footer_terms")}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
