"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Script from "next/script"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n, localePath, type Lang } from "@/lib/i18n"

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", org_name: "", phone: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState("")
  const turnstileRef = useRef<HTMLDivElement>(null)
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

  const onTurnstileLoad = useCallback(() => {
    if (turnstileRef.current && (window as any).turnstile) {
      (window as any).turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        theme: "light",
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError(lang === "tr" ? "Geçerli bir e-posta adresi girin" : "Enter a valid email address")
      return
    }
    if (!turnstileToken) {
      setError(lang === "tr" ? "Lütfen doğrulamayı tamamlayın" : "Please complete the verification")
      return
    }
    setLoading(true)
    try {
      const tokens = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ ...form, turnstile_token: turnstileToken }),
      })
      const user = await api("/auth/me", { token: tokens.access_token })
      setAuth(user, tokens.access_token, tokens.refresh_token)
      router.push(localePath("inbox", lang))
    } catch (err: any) {
      setError(err.message || (lang === "tr" ? "Kayıt başarısız" : "Registration failed"))
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))
  const isTR = lang === "tr"

  return (
    <div className="min-h-screen flex">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        onLoad={onTurnstileLoad}
        strategy="afterInteractive"
      />

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[52%] bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 relative overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0">
          <div className="absolute top-20 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16 py-12 w-full">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-emerald-100 text-xs font-semibold px-4 py-2 rounded-full w-fit mb-6">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"/></svg>
            {isTR ? "14 gün ücretsiz deneyin" : "14 days free trial"}
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-5 whitespace-nowrap">
            {isTR
              ? "Müşteri iletişiminizi dönüştürün"
              : "Transform your customer communication"}
          </h1>
          <p className="text-emerald-100/80 text-lg leading-relaxed mb-12 max-w-lg">
            {isTR
              ? "WhatsApp, Instagram, Facebook ve daha fazlasını tek platformdan yönetin. AI destekli chatbot ile 7/24 müşteri desteği sağlayın."
              : "Manage WhatsApp, Instagram, Facebook and more from one platform. Provide 24/7 customer support with AI-powered chatbot."}
          </p>

          {/* What you get */}
          <div className="space-y-4">
            {(isTR ? [
              "Sınırsız mesajlaşma ve konuşma",
              "AI destekli chatbot ve otomasyon",
              "CRM, pipeline ve müşteri yönetimi",
              "Toplu mesaj ve broadcast",
              "Detaylı analitik ve raporlar",
            ] : [
              "Unlimited messaging and conversations",
              "AI-powered chatbot and automation",
              "CRM, pipeline and customer management",
              "Bulk messaging and broadcast",
              "Detailed analytics and reports",
            ]).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-300 flex-shrink-0"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                <span className="text-sm text-emerald-100/80">{item}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div className="mt-12 pt-8 border-t border-white/10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"].map((c, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-emerald-700 flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: c }}>
                  {["A", "M", "E", "K"][i]}
                </div>
              ))}
            </div>
            <span className="text-sm text-emerald-200/60">
              {isTR ? "500+ işletme YO Dijital kullanıyor" : "500+ businesses use YO Dijital"}
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel - Register Form */}
      <div className="flex-1 flex flex-col bg-gray-50/50">
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[480px]">
            {/* Mobile branding */}
            <div className="text-center mb-8 lg:hidden">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {isTR ? "Müşteri iletişiminizi dönüştürün" : "Transform your communication"}
              </h2>
              <p className="text-gray-400 text-sm">
                {isTR ? "Ücretsiz hesap oluşturun" : "Create your free account"}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xl shadow-gray-200/50 p-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {isTR ? "Ücretsiz Başlayın" : "Start Free"}
              </h2>
              <p className="text-sm text-gray-400 mb-8">
                {isTR ? "Kredi kartı gerekmez, hemen kullanmaya başlayın" : "No credit card required, start using immediately"}
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-5 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isTR ? "Ad Soyad" : "Full Name"}
                    </label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => update("full_name", e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                      placeholder={isTR ? "Adınız Soyadınız" : "Your Full Name"}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {isTR ? "Şirket Adı" : "Company"}
                    </label>
                    <input
                      type="text"
                      value={form.org_name}
                      onChange={(e) => update("org_name", e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                      placeholder={isTR ? "Şirketiniz" : "Your Company"}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isTR ? "Telefon" : "Phone"}
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                    placeholder={isTR ? "+90 5XX XXX XX XX" : "+1 XXX XXX XXXX"}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isTR ? "E-posta" : "Email"}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                    placeholder={isTR ? "örnek@sirket.com" : "example@company.com"}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {isTR ? "Şifre" : "Password"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                      placeholder={isTR ? "Minimum 8 karakter" : "Minimum 8 characters"}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                          <path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                          <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Cloudflare Turnstile */}
                <div ref={turnstileRef} className="flex justify-center" />

                <button
                  type="submit"
                  disabled={loading || !turnstileToken}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl py-3.5 transition-all duration-200 shadow-lg shadow-emerald-600/25 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
                >
                  {loading
                    ? (isTR ? "Kayıt yapılıyor..." : "Creating account...")
                    : (isTR ? "Ücretsiz Hesap Oluştur" : "Create Free Account")}
                </button>

                <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                  {isTR
                    ? "Kayıt olarak Kullanım Şartları ve Gizlilik Politikası'nı kabul etmiş olursunuz."
                    : "By signing up you agree to our Terms of Service and Privacy Policy."}
                </p>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400">{isTR ? "veya" : "or"}</span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500">
                {isTR ? "Zaten hesabınız var mı? " : "Already have an account? "}
                <Link href={`/${lang}/login`} className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors">
                  {isTR ? "Giriş Yap" : "Sign In"}
                </Link>
              </p>
            </div>
          </div>
        </div>

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
    </div>
  )
}
