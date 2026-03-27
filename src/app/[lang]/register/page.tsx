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
      setError(lang === "tr" ? "Gecerli bir e-posta adresi girin" : "Enter a valid email address")
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
      setError(err.message || (lang === "tr" ? "Kayit basarisiz" : "Registration failed"))
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))
  const isTR = lang === "tr"

  return (
    <div className="min-h-screen bg-[#060609] flex flex-col relative overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md" style={{ fontSize: "16px" }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-3">
              <Image src="/logo.png" alt="YoChat" width={40} height={40} className="invert rounded-xl" />
              <h1 className="text-3xl font-bold">
                <span className="text-white">Yo</span>
                <span className="text-primary">Chat</span>
              </h1>
            </div>
            <p className="text-gray-500 mt-2 text-sm">{isTR ? "7 gun ucretsiz deneyin" : "Try free for 7 days"}</p>
          </div>

          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white mb-6">{isTR ? "Kayit Ol" : "Sign Up"}</h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{isTR ? "Ad Soyad" : "Full Name"}</label>
                <input type="text" value={form.full_name} onChange={(e) => update("full_name", e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-150"
                  placeholder={isTR ? "Adiniz Soyadiniz" : "Your Full Name"} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{isTR ? "Sirket Adi" : "Company Name"}</label>
                <input type="text" value={form.org_name} onChange={(e) => update("org_name", e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-150"
                  placeholder={isTR ? "Sirketinizin Adi" : "Your Company Name"} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{isTR ? "E-posta" : "Email"}</label>
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-150"
                  placeholder={isTR ? "ornek@sirket.com" : "example@company.com"} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">{isTR ? "Sifre" : "Password"}</label>
                <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-150"
                  placeholder={isTR ? "Minimum 8 karakter" : "Minimum 8 characters"} required minLength={8} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg py-2.5 transition-all duration-150 shadow-lg shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? (isTR ? "Kayit yapiliyor..." : "Creating account...") : (isTR ? "Ucretsiz Baslat" : "Start Free")}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm mt-6">
              {isTR ? "Zaten hesabin var mi? " : "Already have an account? "}
              <Link href={`/${lang}/login`} className="text-primary hover:text-primary-light transition-colors duration-150">
                {isTR ? "Giris Yap" : "Sign In"}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <footer className="relative z-10 border-t border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="YO Dijital" width={20} height={20} className="invert opacity-50" />
          <span className="text-gray-600 text-xs">2025 YO Dijital. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <a href={`/${lang}/privacy-policy`} className="text-gray-600 hover:text-gray-400 text-xs transition-colors duration-150">{t("footer_privacy")}</a>
          <a href={`/${lang}/cookie-policy`} className="text-gray-600 hover:text-gray-400 text-xs transition-colors duration-150">{t("footer_cookie")}</a>
          <a href={`/${lang}/terms-of-service`} className="text-gray-600 hover:text-gray-400 text-xs transition-colors duration-150">{t("footer_terms")}</a>
          <a href={`/${lang}/data-deletion`} className="text-gray-600 hover:text-gray-400 text-xs transition-colors duration-150">{t("footer_data_deletion")}</a>
        </div>
      </footer>
    </div>
  )
}
