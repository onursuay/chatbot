"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n, localePath, type Lang } from "@/lib/i18n"

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", org_name: "", phone: "" })
  const [passwordConfirm, setPasswordConfirm] = useState("")
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

    for (let i = 0; i < 40; i++) {
      nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 2 + 1.5 })
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        n.x += n.vx; n.y += n.vy
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
        n.x = Math.max(0, Math.min(w, n.x))
        n.y = Math.max(0, Math.min(h, n.y))
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
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
        const from = nodes[pulse.from], to = nodes[pulse.to]
        const px = from.x + (to.x - from.x) * pulse.t, py = from.y + (to.y - from.y) * pulse.t
        const glow = Math.sin(pulse.t * Math.PI)
        ctx!.beginPath(); ctx!.arc(px, py, 2, 0, Math.PI * 2); ctx!.fillStyle = `rgba(16,185,129,${glow * 0.8})`; ctx!.fill()
        ctx!.beginPath(); ctx!.arc(px, py, 5, 0, Math.PI * 2); ctx!.fillStyle = `rgba(16,185,129,${glow * 0.2})`; ctx!.fill()
      }
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx!.fillStyle = "rgba(255,255,255,0.25)"; ctx!.fill()
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r + 3, 0, Math.PI * 2); ctx!.fillStyle = "rgba(255,255,255,0.03)"; ctx!.fill()
      }
      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!form.full_name.trim()) {
      setError(lang === "tr" ? "Ad Soyad zorunludur" : "Full name is required")
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) {
      setError(lang === "tr" ? "Geçerli bir e-posta adresi girin" : "Enter a valid email address")
      return
    }
    if (!form.password || form.password.length < 8) {
      setError(lang === "tr" ? "Şifre en az 8 karakter olmalıdır" : "Password must be at least 8 characters")
      return
    }
    if (form.password !== passwordConfirm) {
      setError(lang === "tr" ? "Şifreler eşleşmiyor" : "Passwords do not match")
      return
    }
    if (form.phone.trim() && !/^[+]?[0-9\s()-]{7,20}$/.test(form.phone.trim())) {
      setError(lang === "tr" ? "Geçerli bir telefon numarası girin" : "Enter a valid phone number")
      return
    }
    if (!termsAccepted) {
      setError(lang === "tr" ? "Devam etmek için koşulları kabul etmelisiniz" : "You must accept the terms to continue")
      return
    }

    setLoading(true)
    try {
      const tokens = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          org_name: form.org_name,
          phone: form.phone || undefined,
        }),
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
    <div className="min-h-screen bg-[#060609] flex flex-col items-center justify-start px-4 py-10 relative overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />

      <div className="w-full max-w-[460px] relative z-10">
        <div className="flex justify-center mb-5">
          <Link href="/">
            <Image src="/logo-yo.png" alt="YO Dijital" width={80} height={28} className="brightness-0 invert" priority />
          </Link>
        </div>

        <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white text-center mb-2">
            {isTR ? "Ücretsiz Başlayın" : "Start Free"}
          </h1>
          <p className="text-sm text-gray-400 text-center mb-6">
            {isTR ? "Kredi kartı gerekmez, hemen kullanmaya başlayın" : "No credit card required, start using immediately"}
          </p>

          {error && (
            <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {isTR ? "Ad Soyad" : "Full Name"} <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                placeholder={isTR ? "Adınız Soyadınız" : "Your Full Name"}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                autoComplete="name"
                required
              />
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
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {isTR ? "Şirket Adı" : "Company Name"} <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={form.org_name}
                onChange={(e) => update("org_name", e.target.value)}
                placeholder={isTR ? "Şirketiniz" : "Your Company"}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                autoComplete="organization"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {isTR ? "Telefon" : "Phone"}
                <span className="text-gray-500 font-normal ml-1">({isTR ? "opsiyonel" : "optional"})</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value.replace(/[^0-9+\s()-]/g, ""))}
                placeholder={isTR ? "+90 555 000 00 00" : "+1 555 000 0000"}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                autoComplete="tel"
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
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                {isTR ? "Şifre Tekrar" : "Confirm Password"} <span className="text-emerald-400">*</span>
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder={isTR ? "Şifrenizi tekrar girin" : "Repeat your password"}
                className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                autoComplete="new-password"
                required
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-white/20 bg-white/[0.04] text-emerald-500 focus:ring-emerald-500/30 accent-emerald-500"
              />
              <span className="text-sm text-gray-400 leading-relaxed">
                {isTR ? (
                  <>
                    <a href={`/${lang}/terms-of-service`} target="_blank" className="text-emerald-400 hover:text-emerald-300 underline">{t("footer_terms")}</a>
                    {" ve "}
                    <a href={`/${lang}/privacy-policy`} target="_blank" className="text-emerald-400 hover:text-emerald-300 underline">{t("footer_privacy")}</a>
                    {"'nı okudum ve kabul ediyorum."}
                  </>
                ) : (
                  <>
                    {"I have read and agree to the "}
                    <a href={`/${lang}/terms-of-service`} target="_blank" className="text-emerald-400 hover:text-emerald-300 underline">{t("footer_terms")}</a>
                    {" and "}
                    <a href={`/${lang}/privacy-policy`} target="_blank" className="text-emerald-400 hover:text-emerald-300 underline">{t("footer_privacy")}</a>
                    {"."}
                  </>
                )}
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !termsAccepted}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-600 hover:to-teal-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? (isTR ? "Kayıt yapılıyor..." : "Creating account...")
                : (isTR ? "Ücretsiz Hesap Oluştur" : "Create Free Account")}
            </button>
          </form>

          <p className="text-xs text-gray-500 text-center mt-4">
            {isTR ? "Kredi kartı gerekmez." : "No credit card required."}
          </p>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {isTR ? "Zaten hesabınız var mı? " : "Already have an account? "}
              <Link href={`/${lang}/login`} className="text-emerald-400 hover:text-emerald-300 font-medium transition">
                {isTR ? "Giriş Yap" : "Log In"}
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-5 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-emerald-400 transition">
            {isTR ? "← Ana sayfaya dön" : "← Back to homepage"}
          </Link>
        </div>

        <div className="mt-4 mb-2 flex flex-wrap justify-center gap-4">
          <a href={`/${lang}/privacy-policy`} className="text-xs text-gray-600 hover:text-gray-400 transition">{t("footer_privacy")}</a>
          <a href={`/${lang}/cookie-policy`} className="text-xs text-gray-600 hover:text-gray-400 transition">{t("footer_cookie")}</a>
          <a href={`/${lang}/terms-of-service`} className="text-xs text-gray-600 hover:text-gray-400 transition">{t("footer_terms")}</a>
          <a href={`/${lang}/data-deletion`} className="text-xs text-gray-600 hover:text-gray-400 transition">{t("footer_data_deletion")}</a>
        </div>
      </div>
    </div>
  )
}
