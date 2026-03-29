"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n, localePath, type Lang } from "@/lib/i18n"

// ===== FLOATING ICONS CANVAS =====
function FloatingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let w = 0, h = 0

    interface FloatingIcon {
      x: number; y: number; vx: number; vy: number
      size: number; rotation: number; rotSpeed: number
      opacity: number; type: string; color: string
    }

    let icons: FloatingIcon[] = []

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      w = canvas.offsetWidth; h = canvas.offsetHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const init = () => {
      resize()
      const types = [
        { type: "chat", color: "74,237,196" },
        { type: "whatsapp", color: "37,211,102" },
        { type: "instagram", color: "225,48,108" },
        { type: "facebook", color: "66,103,178" },
        { type: "bot", color: "139,92,246" },
        { type: "mail", color: "59,130,246" },
        { type: "bell", color: "245,158,11" },
        { type: "chart", color: "74,237,196" },
      ]
      icons = Array.from({ length: 20 }, (_, i) => {
        const t = types[i % types.length]
        return {
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.25,
          size: 16 + Math.random() * 20,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.003,
          opacity: 0.06 + Math.random() * 0.08,
          type: t.type, color: t.color,
        }
      })
    }

    const drawIcon = (icon: FloatingIcon) => {
      ctx.save()
      ctx.translate(icon.x, icon.y)
      ctx.rotate(icon.rotation)
      ctx.globalAlpha = icon.opacity
      const s = icon.size

      ctx.strokeStyle = `rgba(${icon.color},${icon.opacity * 4})`
      ctx.lineWidth = 1.5
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      switch (icon.type) {
        case "chat":
          ctx.beginPath()
          ctx.moveTo(-s/2, -s/3); ctx.lineTo(s/2, -s/3)
          ctx.quadraticCurveTo(s/2+s/6, -s/3, s/2+s/6, -s/6)
          ctx.lineTo(s/2+s/6, s/4)
          ctx.quadraticCurveTo(s/2+s/6, s/3+s/12, s/2, s/3+s/12)
          ctx.lineTo(-s/6, s/3+s/12); ctx.lineTo(-s/3, s/2)
          ctx.lineTo(-s/3, s/3+s/12); ctx.lineTo(-s/2, s/3+s/12)
          ctx.quadraticCurveTo(-s/2-s/6, s/3+s/12, -s/2-s/6, s/4)
          ctx.lineTo(-s/2-s/6, -s/6)
          ctx.quadraticCurveTo(-s/2-s/6, -s/3, -s/2, -s/3)
          ctx.stroke()
          // Lines inside
          ctx.beginPath()
          ctx.moveTo(-s/3, -s/8); ctx.lineTo(s/3, -s/8)
          ctx.moveTo(-s/3, s/8); ctx.lineTo(s/6, s/8)
          ctx.stroke()
          break
        case "whatsapp":
          ctx.beginPath()
          ctx.arc(0, 0, s/2.5, 0, Math.PI * 2)
          ctx.stroke()
          // Phone icon
          ctx.beginPath()
          ctx.moveTo(-s/6, s/6)
          ctx.quadraticCurveTo(-s/4, -s/6, 0, -s/5)
          ctx.quadraticCurveTo(s/4, -s/4, s/6, s/8)
          ctx.stroke()
          break
        case "instagram":
          const r = s / 2.5
          ctx.beginPath()
          ctx.roundRect(-r, -r, r*2, r*2, r*0.3)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(0, 0, r*0.4, 0, Math.PI * 2)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(r*0.6, -r*0.6, r*0.1, 0, Math.PI * 2)
          ctx.fillStyle = ctx.strokeStyle
          ctx.fill()
          break
        case "facebook":
          ctx.beginPath()
          ctx.arc(0, 0, s/2.5, 0, Math.PI * 2)
          ctx.stroke()
          ctx.font = `bold ${s*0.6}px Inter, sans-serif`
          ctx.textAlign = "center"; ctx.textBaseline = "middle"
          ctx.fillStyle = ctx.strokeStyle
          ctx.fillText("f", 0, 1)
          break
        case "bot":
          ctx.beginPath()
          ctx.roundRect(-s/3, -s/6, s/1.5, s/2.5, s/10)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(0, -s/6); ctx.lineTo(0, -s/3)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(0, -s/3, s/12, 0, Math.PI * 2)
          ctx.stroke()
          // Eyes
          ctx.beginPath()
          ctx.arc(-s/8, s/12, s/14, 0, Math.PI * 2)
          ctx.arc(s/8, s/12, s/14, 0, Math.PI * 2)
          ctx.fillStyle = ctx.strokeStyle; ctx.fill()
          break
        case "mail":
          ctx.beginPath()
          ctx.roundRect(-s/2.5, -s/4, s/1.25, s/2, s/14)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(-s/2.5, -s/4); ctx.lineTo(0, s/12); ctx.lineTo(s/2.5, -s/4)
          ctx.stroke()
          break
        case "bell":
          ctx.beginPath()
          ctx.moveTo(-s/4, s/8)
          ctx.quadraticCurveTo(-s/4, -s/3, 0, -s/3)
          ctx.quadraticCurveTo(s/4, -s/3, s/4, s/8)
          ctx.lineTo(-s/4, s/8)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(-s/3, s/8); ctx.lineTo(s/3, s/8)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(0, s/5, s/10, 0, Math.PI * 2)
          ctx.stroke()
          break
        case "chart":
          ctx.beginPath()
          ctx.moveTo(-s/3, s/3); ctx.lineTo(-s/3, -s/6)
          ctx.moveTo(-s/8, s/3); ctx.lineTo(-s/8, -s/3)
          ctx.moveTo(s/8, s/3); ctx.lineTo(s/8, 0)
          ctx.moveTo(s/3, s/3); ctx.lineTo(s/3, -s/5)
          ctx.stroke()
          break
      }
      ctx.restore()
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)

      for (const icon of icons) {
        icon.x += icon.vx; icon.y += icon.vy; icon.rotation += icon.rotSpeed
        if (icon.x < -40) icon.x = w + 40
        if (icon.x > w + 40) icon.x = -40
        if (icon.y < -40) icon.y = h + 40
        if (icon.y > h + 40) icon.y = -40
        drawIcon(icon)
      }

      // Subtle connection lines between nearby icons
      for (let i = 0; i < icons.length; i++) {
        for (let j = i + 1; j < icons.length; j++) {
          const dx = icons[i].x - icons[j].x
          const dy = icons[i].y - icons[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 250) {
            ctx.beginPath()
            ctx.moveTo(icons[i].x, icons[i].y)
            ctx.lineTo(icons[j].x, icons[j].y)
            ctx.strokeStyle = `rgba(74,237,196,${(1 - dist / 250) * 0.04})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }

    init()
    animId = requestAnimationFrame(draw)
    window.addEventListener("resize", resize)
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

// ===== LOGIN PAGE =====
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
      setError(err.message || (lang === "tr" ? "Giris basarisiz" : "Login failed"))
    } finally {
      setLoading(false)
    }
  }

  const isTR = lang === "tr"

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1629] via-[#1a1d2e] to-[#0d1117] flex flex-col relative overflow-hidden">
      <FloatingCanvas />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-3">
              <Image src="/logo.png" alt="YoChat" width={44} height={44} className="invert rounded-xl" />
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-white">Yo</span>
                <span className="text-primary">Chat</span>
              </h1>
            </div>
            <p className="text-white/40 mt-2 text-sm tracking-wide">
              {isTR ? "Omni-Channel Mesajlasma & CRM Platformu" : "Omni-Channel Messaging & CRM Platform"}
            </p>

            {/* Kanal ikonları */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {[
                { label: "WhatsApp", color: "#25D366", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492l4.625-1.477A11.929 11.929 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.16 0-4.16-.69-5.795-1.862l-.415-.298-2.735.874.876-2.685-.326-.443A9.724 9.724 0 012.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75z"/></svg> },
                { label: "Instagram", color: "#E1306C", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
                { label: "Messenger", color: "#4267B2", icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 0C5.373 0 0 4.975 0 11.111c0 3.497 1.745 6.616 4.472 8.652V24l4.086-2.242c1.09.301 2.246.464 3.442.464 6.627 0 12-4.974 12-11.111C24 4.975 18.627 0 12 0zm1.193 14.963l-3.056-3.259-5.963 3.259L10.733 8.3l3.13 3.259L19.752 8.3l-6.559 6.663z"/></svg> },
                { label: "AI Bot", color: "#8B5CF6", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><circle cx="8" cy="14" r="1.5" fill="currentColor"/><circle cx="16" cy="14" r="1.5" fill="currentColor"/></svg> },
              ].map((ch) => (
                <div key={ch.label} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.04]">
                  <span style={{ color: ch.color }}>{ch.icon}</span>
                  <span className="text-[11px] text-white/40 font-medium">{ch.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-8 backdrop-blur-lg shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-6">
              {isTR ? "Giris Yap" : "Sign In"}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-white/50 mb-1.5 font-medium">
                  {isTR ? "E-posta" : "Email"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  placeholder={isTR ? "ornek@sirket.com" : "example@company.com"}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-1.5 font-medium">
                  {isTR ? "Sifre" : "Password"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  placeholder="********"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-[#0a2e24] font-bold rounded-lg py-3 transition-all duration-200 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading
                  ? (isTR ? "Giris yapiliyor..." : "Signing in...")
                  : (isTR ? "Giris Yap" : "Sign In")}
              </button>
            </form>

            <p className="text-center text-white/30 text-sm mt-6">
              {isTR ? "Hesabin yok mu? " : "Don't have an account? "}
              <Link href={`/${lang}/register`} className="text-primary hover:text-primary-light font-medium transition-colors">
                {isTR ? "Kayit Ol" : "Sign Up"}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="YO Dijital" width={18} height={18} className="invert opacity-30" />
          <span className="text-white/20 text-xs">2025 YO Dijital. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <a href={`/${lang}/privacy-policy`} className="text-white/20 hover:text-white/40 text-xs transition-colors">{t("footer_privacy")}</a>
          <a href={`/${lang}/cookie-policy`} className="text-white/20 hover:text-white/40 text-xs transition-colors">{t("footer_cookie")}</a>
          <a href={`/${lang}/terms-of-service`} className="text-white/20 hover:text-white/40 text-xs transition-colors">{t("footer_terms")}</a>
          <a href={`/${lang}/data-deletion`} className="text-white/20 hover:text-white/40 text-xs transition-colors">{t("footer_data_deletion")}</a>
        </div>
      </footer>
    </div>
  )
}
