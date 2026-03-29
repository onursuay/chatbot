"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n, localePath, type Lang } from "@/lib/i18n"

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", org_name: "" })
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError(lang === "tr" ? "Geçerli bir e-posta adresi girin" : "Enter a valid email address")
      return
    }
    setLoading(true)
    try {
      const tokens = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo-yo.png" alt="YO Dijital" width={36} height={36} />
          <span className="font-bold text-lg text-gray-900">YO<span className="text-emerald-600">dijital</span></span>
        </Link>
        <Link
          href={`/${lang}/login`}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          {isTR ? "Giriş Yap" : "Sign In"} &rarr;
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[960px] flex items-center gap-16">

          {/* Left - Branding (desktop) */}
          <div className="hidden lg:flex flex-col flex-1 max-w-[440px]">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full w-fit mb-4">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"/></svg>
              {isTR ? "14 gün ücretsiz deneyin" : "14 days free trial"}
            </div>

            <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-3">
              {isTR
                ? "Müşteri iletişiminizi dönüştürün"
                : "Transform your customer communication"}
            </h1>
            <p className="text-gray-500 text-base leading-relaxed mb-8">
              {isTR
                ? "WhatsApp, Instagram, Facebook ve daha fazlasını tek platformdan yönetin. AI destekli chatbot ile 7/24 müşteri desteği sağlayın."
                : "Manage WhatsApp, Instagram, Facebook and more from one platform. Provide 24/7 customer support with AI-powered chatbot."}
            </p>

            {/* What you get */}
            <div className="space-y-3">
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
                <div key={i} className="flex items-center gap-2.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd"/></svg>
                  <span className="text-sm text-gray-600">{item}</span>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B"].map((c, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: c }}>
                    {["A", "M", "E", "K"][i]}
                  </div>
                ))}
              </div>
              <span className="text-xs text-gray-400">
                {isTR ? "500+ işletme YO Dijital kullanıyor" : "500+ businesses use YO Dijital"}
              </span>
            </div>
          </div>

          {/* Right - Register Card */}
          <div className="w-full max-w-[420px] mx-auto lg:mx-0">
            {/* Mobile logo */}
            <div className="text-center mb-6 lg:hidden">
              <Image src="/logo-yo.png" alt="YO Dijital" width={48} height={48} className="mx-auto mb-2" />
              <p className="text-gray-400 text-sm">
                {isTR ? "Ücretsiz hesap oluşturun" : "Create your free account"}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xl shadow-gray-200/40 p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {isTR ? "Ücretsiz Başlayın" : "Start Free"}
              </h2>
              <p className="text-sm text-gray-400 mb-6">
                {isTR ? "Kredi kartı gerekmez, hemen kullanmaya başlayın" : "No credit card required, start using immediately"}
              </p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 mb-4 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {isTR ? "Ad Soyad" : "Full Name"}
                    </label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => update("full_name", e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                      placeholder={isTR ? "Adınız Soyadınız" : "Your Full Name"}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {isTR ? "Şirket Adı" : "Company"}
                    </label>
                    <input
                      type="text"
                      value={form.org_name}
                      onChange={(e) => update("org_name", e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                      placeholder={isTR ? "Şirketiniz" : "Your Company"}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {isTR ? "E-posta" : "Email"}
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
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
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                    placeholder={isTR ? "Minimum 8 karakter" : "Minimum 8 characters"}
                    required
                    minLength={8}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl py-3 transition-all duration-200 shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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

              <div className="relative my-5">
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
