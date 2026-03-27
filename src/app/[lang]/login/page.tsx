"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n, localePath, type Lang } from "@/lib/i18n"

// ===== NEURAL NETWORK CANVAS =====
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = []
    let pulses: { from: number; to: number; progress: number; speed: number }[] = []

    const NODE_COUNT = 35
    const CONNECT_DIST = 180
    const MAX_PULSES = 15

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    const init = () => {
      resize()
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 1.5 + Math.random() * 2,
      }))
    }

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      // Move nodes
      for (const n of nodes) {
        n.x += n.vx
        n.y += n.vy
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.35
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255,255,255,0.25)"
        ctx.fill()
      }

      // Create pulses
      if (pulses.length < MAX_PULSES && Math.random() < 0.008) {
        const from = Math.floor(Math.random() * NODE_COUNT)
        let to = Math.floor(Math.random() * NODE_COUNT)
        if (to === from) to = (to + 1) % NODE_COUNT
        pulses.push({ from, to, progress: 0, speed: 0.005 + Math.random() * 0.01 })
      }

      // Draw pulses
      pulses = pulses.filter((p) => {
        p.progress += p.speed
        if (p.progress >= 1) return false

        const fromN = nodes[p.from]
        const toN = nodes[p.to]
        const x = fromN.x + (toN.x - fromN.x) * p.progress
        const y = fromN.y + (toN.y - fromN.y) * p.progress
        const alpha = Math.sin(p.progress * Math.PI) * 0.8

        ctx.beginPath()
        ctx.arc(x, y, 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(16,185,129,${alpha})`
        ctx.fill()

        // Glow
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(16,185,129,${alpha * 0.2})`
        ctx.fill()

        return true
      })

      animId = requestAnimationFrame(draw)
    }

    init()
    draw()
    window.addEventListener("resize", resize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
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
      {/* Neural Network Canvas */}
      <NeuralCanvas />

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md" style={{ fontSize: "16px" }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-3">
              <Image src="/logo.png" alt="YoChat" width={40} height={40} className="invert rounded-xl" />
              <h1 className="text-3xl font-bold">
                <span className="text-white">Yo</span>
                <span className="text-primary">Chat</span>
              </h1>
            </div>
            <p className="text-gray-500 mt-2 text-sm">WhatsApp Business Platform</p>
          </div>

          {/* Glassmorphism Card */}
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
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
                <label className="block text-sm text-gray-400 mb-1.5">
                  {isTR ? "E-posta" : "Email"}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-150"
                  placeholder={isTR ? "ornek@sirket.com" : "example@company.com"}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  {isTR ? "Sifre" : "Password"}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all duration-150"
                  placeholder="********"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-lg py-2.5 transition-all duration-150 shadow-lg shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? (isTR ? "Giris yapiliyor..." : "Signing in...")
                  : (isTR ? "Giris Yap" : "Sign In")}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm mt-6">
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
