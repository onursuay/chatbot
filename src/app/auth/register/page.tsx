"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", org_name: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setAuth } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError("Geçerli bir e-posta adresi girin")
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
      router.push("/dashboard/inbox")
    } catch (err: any) {
      setError(err.message || "Kayıt başarısız")
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="text-dark-950 font-bold text-lg">W</span>
            </div>
            <h1 className="text-3xl font-bold">
              <span className="text-white">Wa</span>
              <span className="text-brand-400">API</span>
            </h1>
          </div>
          <p className="text-dark-400 mt-2">7 gün ücretsiz deneyin</p>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Kayıt Ol</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Ad Soyad</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                placeholder="Onur Şuay"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Şirket Adı</label>
              <input
                type="text"
                value={form.org_name}
                onChange={(e) => update("org_name", e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                placeholder="Yo Dijital Medya"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">E-posta</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                placeholder="örnek@sirket.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-dark-300 mb-1.5">Şifre</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-2.5 text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
                placeholder="Minimum 8 karakter"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold rounded-lg py-2.5 transition disabled:opacity-50"
            >
              {loading ? "Kayıt yapılıyor..." : "Ücretsiz Başlat"}
            </button>
          </form>

          <p className="text-center text-dark-400 text-sm mt-6">
            Zaten hesabın var mı?{" "}
            <Link href="/auth/login" className="text-brand-400 hover:text-brand-300">
              Giriş Yap
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
