"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n, localePath, type Lang } from "@/lib/i18n"

// ===== MESSAGING NETWORK CANVAS =====
function MessagingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let w = 0, h = 0

    // Mesaj baloncukları — farklı kanalları temsil eder
    interface Bubble {
      x: number; y: number
      vx: number; vy: number
      size: number
      type: "whatsapp" | "instagram" | "facebook" | "crm" | "bot"
      opacity: number
      pulsePhase: number
    }

    // Uçan mesaj parçacıkları
    interface Particle {
      x: number; y: number
      targetX: number; targetY: number
      progress: number
      speed: number
      fromIdx: number; toIdx: number
      color: string
    }

    const COLORS = {
      whatsapp: { r: 37, g: 211, b: 102 },    // WhatsApp yeşil
      instagram: { r: 225, g: 48, b: 108 },    // Instagram pembe
      facebook: { r: 66, g: 103, b: 178 },     // Facebook mavi
      crm: { r: 74, g: 237, b: 196 },          // Mint (primary)
      bot: { r: 168, g: 130, b: 255 },         // AI mor
    }

    let bubbles: Bubble[] = []
    let particles: Particle[] = []

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const init = () => {
      resize()
      const types: Bubble["type"][] = ["whatsapp", "instagram", "facebook", "crm", "bot"]
      bubbles = Array.from({ length: 24 }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: 4 + Math.random() * 8,
        type: types[i % types.length],
        opacity: 0.15 + Math.random() * 0.25,
        pulsePhase: Math.random() * Math.PI * 2,
      }))
    }

    const drawBubbleIcon = (b: Bubble, time: number) => {
      const c = COLORS[b.type]
      const pulse = Math.sin(time * 0.001 + b.pulsePhase) * 0.1 + 0.9
      const s = b.size * pulse
      const alpha = b.opacity * pulse

      // Dış glow
      const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, s * 3)
      gradient.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${alpha * 0.15})`)
      gradient.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`)
      ctx.fillStyle = gradient
      ctx.fillRect(b.x - s * 3, b.y - s * 3, s * 6, s * 6)

      // Ana daire
      ctx.beginPath()
      ctx.arc(b.x, b.y, s, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`
      ctx.fill()

      // İç parlama
      ctx.beginPath()
      ctx.arc(b.x, b.y, s * 0.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha * 0.6})`
      ctx.fill()

      // Mesaj baloncuğu ikonu (büyük node'lar için)
      if (b.size > 8) {
        ctx.save()
        ctx.globalAlpha = alpha * 0.8

        if (b.type === "whatsapp") {
          // Telefon ikonu
          ctx.beginPath()
          ctx.arc(b.x, b.y, s * 0.35, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,0.7)`
          ctx.fill()
        } else if (b.type === "bot") {
          // AI yıldız
          const starSize = s * 0.3
          for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI) / 2 + time * 0.001
            ctx.beginPath()
            ctx.arc(
              b.x + Math.cos(angle) * starSize,
              b.y + Math.sin(angle) * starSize,
              1, 0, Math.PI * 2
            )
            ctx.fillStyle = `rgba(255,255,255,0.6)`
            ctx.fill()
          }
        }

        ctx.restore()
      }
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h)

      // Move bubbles
      for (const b of bubbles) {
        b.x += b.vx
        b.y += b.vy
        if (b.x < -20) b.x = w + 20
        if (b.x > w + 20) b.x = -20
        if (b.y < -20) b.y = h + 20
        if (b.y > h + 20) b.y = -20
      }

      // Bağlantı çizgileri (yakın node'lar arası)
      const connectDist = 200
      for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
          const dx = bubbles[i].x - bubbles[j].x
          const dy = bubbles[i].y - bubbles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < connectDist) {
            const alpha = (1 - dist / connectDist) * 0.08
            ctx.beginPath()
            ctx.moveTo(bubbles[i].x, bubbles[i].y)
            ctx.lineTo(bubbles[j].x, bubbles[j].y)
            ctx.strokeStyle = `rgba(74,237,196,${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // Mesaj parçacıkları oluştur (bir bubble'dan diğerine uçan mesajlar)
      if (particles.length < 8 && Math.random() < 0.015) {
        const fromIdx = Math.floor(Math.random() * bubbles.length)
        let toIdx = Math.floor(Math.random() * bubbles.length)
        if (toIdx === fromIdx) toIdx = (toIdx + 1) % bubbles.length
        const from = bubbles[fromIdx]
        const to = bubbles[toIdx]
        const c = COLORS[from.type]
        particles.push({
          x: from.x, y: from.y,
          targetX: to.x, targetY: to.y,
          progress: 0,
          speed: 0.008 + Math.random() * 0.012,
          fromIdx, toIdx,
          color: `${c.r},${c.g},${c.b}`,
        })
      }

      // Parçacıkları çiz (mesaj uçuşu efekti)
      particles = particles.filter((p) => {
        p.progress += p.speed
        if (p.progress >= 1) return false

        // Hedef güncelle (hareketli hedef)
        const to = bubbles[p.toIdx]
        p.targetX = to.x
        p.targetY = to.y

        const from = bubbles[p.fromIdx]
        const t = p.progress

        // Eğrisel yol (bezier curve efekti)
        const midX = (from.x + p.targetX) / 2 + (Math.sin(t * Math.PI) * 30)
        const midY = (from.y + p.targetY) / 2 - (Math.sin(t * Math.PI) * 30)

        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * p.targetX
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * midY + t * t * p.targetY

        const alpha = Math.sin(t * Math.PI) * 0.9

        // Mesaj baloncuğu şekli
        ctx.save()

        // İz (trail)
        const trailLen = 5
        for (let i = 0; i < trailLen; i++) {
          const tt = Math.max(0, t - i * 0.02)
          const tx = (1 - tt) * (1 - tt) * from.x + 2 * (1 - tt) * tt * midX + tt * tt * p.targetX
          const ty = (1 - tt) * (1 - tt) * from.y + 2 * (1 - tt) * tt * midY + tt * tt * p.targetY
          ctx.beginPath()
          ctx.arc(tx, ty, 1.5 - i * 0.2, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${p.color},${alpha * (1 - i / trailLen) * 0.3})`
          ctx.fill()
        }

        // Ana parçacık
        ctx.beginPath()
        ctx.arc(x, y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color},${alpha})`
        ctx.fill()

        // Glow
        ctx.beginPath()
        ctx.arc(x, y, 8, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color},${alpha * 0.12})`
        ctx.fill()

        ctx.restore()

        return true
      })

      // Bubble'ları çiz
      for (const b of bubbles) {
        drawBubbleIcon(b, time)
      }

      // Hafif vignette efekti
      const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7)
      vignette.addColorStop(0, "rgba(0,0,0,0)")
      vignette.addColorStop(1, "rgba(0,0,0,0.4)")
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, w, h)

      animId = requestAnimationFrame(draw)
    }

    init()
    animId = requestAnimationFrame(draw)
    window.addEventListener("resize", () => { resize(); })
    return () => {
      cancelAnimationFrame(animId)
    }
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
    <div className="min-h-screen bg-[#060609] flex flex-col relative overflow-hidden">
      {/* Messaging Network Canvas */}
      <MessagingCanvas />

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `radial-gradient(rgba(74,237,196,0.03) 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md" style={{ fontSize: "16px" }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-3">
              <Image src="/logo.png" alt="YoChat" width={44} height={44} className="invert rounded-xl" />
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-white">Yo</span>
                <span className="text-primary">Chat</span>
              </h1>
            </div>
            <p className="text-ink-tertiary mt-2 text-sm tracking-wide">
              {isTR ? "Omni-Channel Mesajlasma & CRM Platformu" : "Omni-Channel Messaging & CRM Platform"}
            </p>

            {/* Kanal ikonları */}
            <div className="flex items-center justify-center gap-3 mt-4">
              {[
                { label: "WhatsApp", color: "#25D366" },
                { label: "Instagram", color: "#E1306C" },
                { label: "Facebook", color: "#4267B2" },
                { label: "AI Bot", color: "#A882FF" },
              ].map((ch) => (
                <div key={ch.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/5 bg-white/[0.03]">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ch.color }} />
                  <span className="text-[11px] text-white/40">{ch.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Glassmorphism Card */}
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8 backdrop-blur-md shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold text-white mb-6">
              {isTR ? "Giris Yap" : "Sign In"}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-white/50 mb-1.5">
                  {isTR ? "E-posta" : "Email"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  placeholder={isTR ? "ornek@sirket.com" : "example@company.com"}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/50 mb-1.5">
                  {isTR ? "Sifre" : "Password"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                  placeholder="********"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-[#0a0a0a] font-bold rounded-lg py-2.5 transition-all duration-200 shadow-lg shadow-primary/15 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? (isTR ? "Giris yapiliyor..." : "Signing in...")
                  : (isTR ? "Giris Yap" : "Sign In")}
              </button>
            </form>

            <p className="text-center text-white/30 text-sm mt-6">
              {isTR ? "Hesabin yok mu? " : "Don't have an account? "}
              <Link href={`/${lang}/register`} className="text-primary hover:text-primary-light transition-colors duration-150">
                {isTR ? "Kayit Ol" : "Sign Up"}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="YO Dijital" width={20} height={20} className="invert opacity-40" />
          <span className="text-white/20 text-xs">2025 YO Dijital. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <a href={`/${lang}/privacy-policy`} className="text-white/20 hover:text-white/40 text-xs transition-colors duration-150">{t("footer_privacy")}</a>
          <a href={`/${lang}/cookie-policy`} className="text-white/20 hover:text-white/40 text-xs transition-colors duration-150">{t("footer_cookie")}</a>
          <a href={`/${lang}/terms-of-service`} className="text-white/20 hover:text-white/40 text-xs transition-colors duration-150">{t("footer_terms")}</a>
          <a href={`/${lang}/data-deletion`} className="text-white/20 hover:text-white/40 text-xs transition-colors duration-150">{t("footer_data_deletion")}</a>
        </div>
      </footer>
    </div>
  )
}
