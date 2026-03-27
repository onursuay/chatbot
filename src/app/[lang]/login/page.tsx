"use client"

import { useState } from "react"
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

  // URL'deki dili sync et
  const urlLang = (params.lang as string) || "tr"
  if (urlLang !== lang && (urlLang === "tr" || urlLang === "en")) {
    setLang(urlLang as Lang)
  }

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
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
                <span className="text-dark-950 font-bold text-lg">Y</span>
              </div>
              <h1 className="text-3xl font-bold">
                <span className="text-white">Yo</span>
                <span className="text-brand-400">Chat</span>
              </h1>
            </div>
            <p className="text-dark-400 mt-2">WhatsApp Business Platform</p>
          </div>

          {/* Form */}
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold text-white mb-6">
              {isTR ? "Giriş Yap" : "Sign In"}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-dark-300 mb-1.5">
                  {isTR ? "E-posta" : "Email"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                  placeholder={isTR ? "örnek@sirket.com" : "example@company.com"}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-dark-300 mb-1.5">
                  {isTR ? "Şifre" : "Password"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                  placeholder="********"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold rounded-lg py-2.5 transition disabled:opacity-50"
              >
                {loading
                  ? (isTR ? "Giriş yapılıyor..." : "Signing in...")
                  : (isTR ? "Giriş Yap" : "Sign In")}
              </button>
            </form>

            <p className="text-center text-dark-400 text-sm mt-6">
              {isTR ? "Hesabın yok mu? " : "Don't have an account? "}
              <Link href={`/${lang}/register`} className="text-brand-400 hover:text-brand-300">
                {isTR ? "Kayıt Ol" : "Sign Up"}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-dark-800/40 bg-dark-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="YO Dijital" width={24} height={24} className="rounded" />
          <span className="text-dark-600 text-xs">2025 YO Dijital. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <a href={`/${lang}/privacy-policy`} className="text-dark-500 hover:text-dark-300 text-xs transition">{t("footer_privacy")}</a>
          <a href={`/${lang}/cookie-policy`} className="text-dark-500 hover:text-dark-300 text-xs transition">{t("footer_cookie")}</a>
          <a href={`/${lang}/terms-of-service`} className="text-dark-500 hover:text-dark-300 text-xs transition">{t("footer_terms")}</a>
          <a href={`/${lang}/data-deletion`} className="text-dark-500 hover:text-dark-300 text-xs transition">{t("footer_data_deletion")}</a>
        </div>
      </footer>
    </div>
  )
}
