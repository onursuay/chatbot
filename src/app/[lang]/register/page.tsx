"use client"

import { useState, useEffect, useRef } from "react"
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
  const [termsAccepted, setTermsAccepted] = useState(false)
  const router = useRouter()
  const params = useParams()
  const { setAuth } = useAuth()
  const { lang, t, setLang } = useI18n()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const urlLang = (params.lang as string) || "tr"
    if (urlLang !== lang && (urlLang === "tr" || urlLang === "en")) {
      setLang(urlLang as Lang)
    }
  }, [params.lang])

  // Neural network animation
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext("2d")
    if (!ctx) return

    let animId: number
    let w = 0, h = 0
    const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = []
    const pulses: { from: number; to: number; t: number; speed: number }[] = []

    function resize() {
      w = c!.width = c!.offsetWidth
      h = c!.height = c!.offsetHeight
    }
    resize()
    window.addEventListener("resize", resize)

    for (let i = 0; i < 35; i++) {
      nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 2 + 1.5 })
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h)
      for (const n of nodes) { n.x += n.vx; n.y += n.vy; if (n.x < 0 || n.x > w) n.vx *= -1; if (n.y < 0 || n.y > h) n.vy *= -1 }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 180) {
            ctx!.beginPath(); ctx!.moveTo(nodes[i].x, nodes[i].y); ctx!.lineTo(nodes[j].x, nodes[j].y)
            ctx!.strokeStyle = `rgba(255,255,255,${(1 - dist / 180) * 0.35})`; ctx!.lineWidth = 0.8; ctx!.stroke()
            if (Math.random() < 0.008 && pulses.length < 15) pulses.push({ from: i, to: j, t: 0, speed: 0.008 + Math.random() * 0.008 })
          }
        }
      }
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pulse = pulses[p]; pulse.t += pulse.speed
        if (pulse.t > 1) { pulses.splice(p, 1); continue }
        const f = nodes[pulse.from], t2 = nodes[pulse.to]
        const px = f.x + (t2.x - f.x) * pulse.t, py = f.y + (t2.y - f.y) * pulse.t
        const glow = Math.sin(pulse.t * Math.PI)
        ctx!.beginPath(); ctx!.arc(px, py, 2, 0, Math.PI * 2); ctx!.fillStyle = `rgba(16,185,129,${glow * 0.8})`; ctx!.fill()
      }
      for (const n of nodes) { ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx!.fillStyle = "rgba(255,255,255,0.25)"; ctx!.fill() }
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize) }
  }, [])

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
    <div className="min-h-screen bg-[#060609] flex flex-col items-center justify-center px-4 py-6 relative overflow-hidden" style={{ fontSize: "16px" }}>
      {/* Neural network canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />

      <div className="w-full max-w-md relative z-10 flex-1 flex flex-col items-center justify-center">
        {/* Logo */}
        <div className="flex justify-center mb-5">
          <Link href="/">
            <Image src="/logo-yo.png" alt="YO Dijital" width={80} height={28} className="brightness-0 invert" priority />
          </Link>
        </div>

        {/* Card */}
        <div className="w-full bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            {isTR ? "Ücretsiz Başlayın" : "Start Free"}
          </h1>
          <p className="text-base text-gray-400 text-center mb-8">
            {isTR ? "Kredi kartı gerekmez, hemen kullanmaya başlayın" : "No credit card required, start using immediately"}
          </p>

          {error && (
            <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {isTR ? "Ad Soyad" : "Full Name"} <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  placeholder={isTR ? "Adınız Soyadınız" : "Your Full Name"}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  {isTR ? "Şirket Adı" : "Company"} <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.org_name}
                  onChange={(e) => update("org_name", e.target.value)}
                  placeholder={isTR ? "Şirketiniz" : "Your Company"}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {isTR ? "E-posta" : "Email"} <span className="text-emerald-400">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder={isTR ? "örnek@sirket.com" : "example@company.com"}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {isTR ? "Şifre" : "Password"} <span className="text-emerald-400">*</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder={isTR ? "Minimum 8 karakter" : "Minimum 8 characters"}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded border transition-colors ${termsAccepted ? "bg-emerald-500 border-emerald-500" : "bg-white/[0.04] border-white/20 group-hover:border-emerald-500/50"}`}>
                  {termsAccepted && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 16 16">
                      <path stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5 6-7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[13px] text-gray-400 leading-relaxed">
                {isTR ? (
                  <>
                    <a href={`/${lang}/terms-of-service`} className="text-emerald-400 hover:text-emerald-300 transition-colors">Kullanım Koşulları</a>
                    {" "}ve{" "}
                    <a href={`/${lang}/privacy-policy`} className="text-emerald-400 hover:text-emerald-300 transition-colors">Gizlilik Politikası</a>
                    {"'nı okudum ve kabul ediyorum."}
                  </>
                ) : (
                  <>
                    {"I have read and agree to the "}
                    <a href={`/${lang}/terms-of-service`} className="text-emerald-400 hover:text-emerald-300 transition-colors">Terms of Service</a>
                    {" and "}
                    <a href={`/${lang}/privacy-policy`} className="text-emerald-400 hover:text-emerald-300 transition-colors">Privacy Policy</a>
                    {"."}
                  </>
                )}
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-600 hover:to-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading
                ? (isTR ? "Kayıt yapılıyor..." : "Creating account...")
                : (isTR ? "Ücretsiz Hesap Oluştur" : "Create Free Account")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {isTR ? "Zaten hesabınız var mı? " : "Already have an account? "}
              <Link href={`/${lang}/login`} className="text-emerald-400 hover:text-emerald-300 font-medium transition">
                {isTR ? "Giriş Yap" : "Log In"}
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-emerald-400 transition">
            {isTR ? "← Ana sayfaya dön" : "← Back to homepage"}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full px-6 py-4 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-gray-600">© 2024-2026 YO Dijital. {isTR ? "Tüm hakları saklıdır." : "All rights reserved."}</span>
          <div className="flex items-center gap-4">
            <a href={`/${lang}/privacy-policy`} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">{t("footer_privacy")}</a>
            <a href={`/${lang}/cookie-policy`} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">{t("footer_cookie")}</a>
            <a href={`/${lang}/terms-of-service`} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">{t("footer_terms")}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
