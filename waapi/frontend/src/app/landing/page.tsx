"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  MessageSquare,
  Bot,
  BarChart3,
  Users,
  Zap,
  Send,
  Shield,
  Globe,
  ArrowRight,
  Check,
  Star,
  Menu,
  X,
  Play,
  Sparkles,
  MessageCircle,
  Workflow,
  Phone,
  Mail,
  Instagram,
  Facebook,
} from "lucide-react"

/* ────────────────────────────────────────────
   Intersection Observer Hook
   ──────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

/* ────────────────────────────────────────────
   Animated Counter
   ──────────────────────────────────────────── */
function Counter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const { ref, inView } = useInView()
  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = end / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [inView, end, duration])
  return <span ref={ref}>{count.toLocaleString("tr-TR")}{suffix}</span>
}

/* ────────────────────────────────────────────
   FLOATING ICONS CANVAS (from login page)
   ──────────────────────────────────────────── */
function FloatingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let w = 0, h = 0
    let time = 0

    interface FloatingIcon {
      x: number; y: number; vx: number; vy: number
      size: number; rotation: number; rotSpeed: number
      baseOpacity: number; type: string; color: string
      pulseOffset: number; glowSize: number
    }

    interface Particle {
      x: number; y: number; vx: number; vy: number
      life: number; maxLife: number; color: string; size: number
    }

    let icons: FloatingIcon[] = []
    let particles: Particle[] = []

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      w = canvas.offsetWidth; h = canvas.offsetHeight
      canvas.width = w * dpr; canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const init = () => {
      resize()
      const types = [
        { type: "whatsapp", color: "37,211,102" },
        { type: "instagram", color: "225,48,108" },
        { type: "facebook", color: "66,103,178" },
        { type: "whatsapp", color: "37,211,102" },
        { type: "instagram", color: "225,48,108" },
        { type: "facebook", color: "66,103,178" },
        { type: "bot", color: "139,92,246" },
        { type: "crm-contact", color: "59,130,246" },
        { type: "crm-pipeline", color: "245,158,11" },
        { type: "crm-chart", color: "17,157,88" },
        { type: "mail", color: "17,157,88" },
        { type: "chat", color: "17,157,88" },
      ]
      icons = Array.from({ length: 50 }, (_, i) => {
        const t = types[i % types.length]
        return {
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.9, vy: (Math.random() - 0.5) * 0.8,
          size: 18 + Math.random() * 30,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.008,
          baseOpacity: 0.15 + Math.random() * 0.2,
          type: t.type, color: t.color,
          pulseOffset: Math.random() * Math.PI * 2,
          glowSize: 35 + Math.random() * 25,
        }
      })
    }

    const drawIcon = (icon: FloatingIcon) => {
      const pulse = Math.sin(time * 0.002 + icon.pulseOffset) * 0.08
      const opacity = icon.baseOpacity + pulse

      ctx.save()
      ctx.translate(icon.x, icon.y)

      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, icon.glowSize)
      glow.addColorStop(0, `rgba(${icon.color},${opacity * 0.25})`)
      glow.addColorStop(1, `rgba(${icon.color},0)`)
      ctx.fillStyle = glow
      ctx.fillRect(-icon.glowSize, -icon.glowSize, icon.glowSize * 2, icon.glowSize * 2)

      ctx.rotate(icon.rotation)
      ctx.globalAlpha = opacity
      const s = icon.size

      ctx.strokeStyle = `rgba(${icon.color},${opacity * 2.5})`
      ctx.fillStyle = `rgba(${icon.color},${opacity * 0.4})`
      ctx.lineWidth = 2
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      switch (icon.type) {
        case "whatsapp": {
          const scale = s / 24
          ctx.save()
          ctx.scale(scale, scale)
          ctx.translate(-12, -12)
          ctx.fillStyle = `rgba(${icon.color},${opacity * 1.2})`
          ctx.strokeStyle = `rgba(${icon.color},${opacity * 2.5})`
          ctx.lineWidth = 1.5 / scale
          ctx.beginPath()
          ctx.arc(12, 11.5, 10, 0, Math.PI * 2)
          ctx.fill(); ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(3.5, 18); ctx.lineTo(1, 23); ctx.lineTo(6.5, 20.5)
          ctx.fillStyle = `rgba(${icon.color},${opacity * 1.2})`
          ctx.fill()
          ctx.fillStyle = `rgba(${icon.color},${opacity * 4})`
          ctx.beginPath()
          ctx.moveTo(16.1, 13.9)
          ctx.bezierCurveTo(15.8, 13.75, 14.5, 13.1, 14.2, 13)
          ctx.bezierCurveTo(13.9, 12.9, 13.7, 12.85, 13.5, 13.15)
          ctx.bezierCurveTo(13.3, 13.45, 12.8, 14.1, 12.6, 14.3)
          ctx.bezierCurveTo(12.4, 14.5, 12.3, 14.5, 12, 14.4)
          ctx.bezierCurveTo(11.7, 14.25, 10.8, 13.95, 9.8, 13.1)
          ctx.bezierCurveTo(9, 12.4, 8.5, 11.5, 8.3, 11.2)
          ctx.bezierCurveTo(8.15, 10.9, 8.3, 10.8, 8.45, 10.65)
          ctx.bezierCurveTo(8.55, 10.5, 8.7, 10.35, 8.85, 10.2)
          ctx.bezierCurveTo(9, 10.05, 9.05, 9.9, 9.15, 9.7)
          ctx.bezierCurveTo(9.25, 9.5, 9.2, 9.35, 9.12, 9.2)
          ctx.bezierCurveTo(9.05, 9.05, 8.5, 7.7, 8.25, 7.1)
          ctx.bezierCurveTo(8.0, 6.5, 7.75, 6.6, 7.6, 6.6)
          ctx.bezierCurveTo(7.4, 6.6, 7.2, 6.6, 7.0, 6.6)
          ctx.bezierCurveTo(6.8, 6.6, 6.5, 6.7, 6.2, 6.95)
          ctx.bezierCurveTo(5.95, 7.25, 5.2, 7.95, 5.2, 9.35)
          ctx.bezierCurveTo(5.2, 10.75, 6.25, 12.1, 6.4, 12.3)
          ctx.bezierCurveTo(6.55, 12.5, 8.5, 15.5, 11.4, 16.8)
          ctx.bezierCurveTo(14.3, 18.1, 14.3, 17.6, 14.8, 17.55)
          ctx.bezierCurveTo(15.3, 17.5, 16.4, 16.85, 16.65, 16.15)
          ctx.bezierCurveTo(16.9, 15.5, 16.9, 14.9, 16.8, 14.8)
          ctx.bezierCurveTo(16.7, 14.65, 16.4, 14.05, 16.1, 13.9)
          ctx.closePath(); ctx.fill()
          ctx.restore()
          break
        }
        case "instagram": {
          const r = s / 2
          ctx.beginPath()
          ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.32)
          ctx.fill(); ctx.stroke()
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(${icon.color},${opacity * 3})`
          ctx.lineWidth = 2.5; ctx.stroke()
          ctx.beginPath()
          ctx.arc(r * 0.55, -r * 0.55, r * 0.12, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${icon.color},${opacity * 3})`
          ctx.fill()
          break
        }
        case "facebook": {
          ctx.beginPath()
          ctx.arc(0, 0, s / 2, 0, Math.PI * 2)
          ctx.fill(); ctx.stroke()
          ctx.font = `bold ${s * 0.65}px Inter, system-ui, sans-serif`
          ctx.textAlign = "center"; ctx.textBaseline = "middle"
          ctx.fillStyle = `rgba(${icon.color},${opacity * 3})`
          ctx.fillText("f", s * 0.04, s * 0.04)
          break
        }
        case "bot": {
          ctx.beginPath()
          ctx.roundRect(-s / 2.8, -s / 5, s / 1.4, s / 1.8, s / 8)
          ctx.fill(); ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(0, -s / 5); ctx.lineTo(0, -s / 2.8)
          ctx.lineWidth = 2.5; ctx.stroke()
          ctx.beginPath()
          ctx.arc(0, -s / 2.8, s / 10, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${icon.color},${opacity * 3})`; ctx.fill()
          ctx.beginPath()
          ctx.arc(-s / 7, s / 10, s / 11, 0, Math.PI * 2)
          ctx.arc(s / 7, s / 10, s / 11, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(0, s / 5, s / 8, 0, Math.PI); ctx.stroke()
          break
        }
        case "crm-contact": {
          ctx.beginPath()
          ctx.arc(0, -s / 5, s / 4, 0, Math.PI * 2)
          ctx.fill(); ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(-s / 2.5, s / 2)
          ctx.quadraticCurveTo(-s / 2.5, s / 8, 0, s / 8)
          ctx.quadraticCurveTo(s / 2.5, s / 8, s / 2.5, s / 2)
          ctx.fill(); ctx.stroke()
          ctx.beginPath()
          ctx.arc(s / 3, -s / 3, s / 8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${icon.color},${opacity * 3})`; ctx.fill()
          break
        }
        case "crm-pipeline": {
          ctx.beginPath()
          ctx.moveTo(-s / 2, -s / 2.5); ctx.lineTo(s / 2, -s / 2.5)
          ctx.lineTo(s / 5, s / 10); ctx.lineTo(s / 5, s / 2)
          ctx.lineTo(-s / 5, s / 2); ctx.lineTo(-s / 5, s / 10)
          ctx.closePath(); ctx.fill(); ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(-s / 3, -s / 6); ctx.lineTo(s / 3, -s / 6)
          ctx.moveTo(-s / 4.5, s / 14); ctx.lineTo(s / 4.5, s / 14)
          ctx.strokeStyle = `rgba(${icon.color},${opacity * 1.5})`; ctx.stroke()
          break
        }
        case "crm-chart": {
          const barW = s / 7
          const heights = [s * 0.3, s * 0.5, s * 0.35, s * 0.7, s * 0.55]
          heights.forEach((bh, i) => {
            const bx = -s / 2.5 + i * (barW + s / 12)
            ctx.fillStyle = `rgba(${icon.color},${opacity * (0.5 + i * 0.15)})`
            ctx.fillRect(bx, s / 2.5 - bh, barW, bh)
            ctx.strokeRect(bx, s / 2.5 - bh, barW, bh)
          })
          ctx.beginPath()
          ctx.moveTo(-s / 2.5, s / 6)
          ctx.quadraticCurveTo(-s / 8, -s / 4, s / 2.5, -s / 3)
          ctx.strokeStyle = `rgba(${icon.color},${opacity * 3})`
          ctx.lineWidth = 2.5; ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(s / 3, -s / 4); ctx.lineTo(s / 2.5, -s / 3); ctx.lineTo(s / 5, -s / 3.2)
          ctx.stroke()
          break
        }
        case "mail": {
          const ew = s / 1.2, eh = s / 1.8
          ctx.beginPath()
          ctx.roundRect(-ew / 2, -eh / 2, ew, eh, s / 10)
          ctx.fill(); ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(-ew / 2, -eh / 2); ctx.lineTo(0, eh / 6); ctx.lineTo(ew / 2, -eh / 2)
          ctx.strokeStyle = `rgba(${icon.color},${opacity * 3})`
          ctx.lineWidth = 2.5; ctx.stroke()
          break
        }
        case "chat": {
          ctx.beginPath()
          ctx.moveTo(-s / 2, -s / 3); ctx.lineTo(s / 2, -s / 3)
          ctx.quadraticCurveTo(s / 1.6, -s / 3, s / 1.6, -s / 6)
          ctx.lineTo(s / 1.6, s / 5)
          ctx.quadraticCurveTo(s / 1.6, s / 3, s / 2, s / 3)
          ctx.lineTo(-s / 8, s / 3); ctx.lineTo(-s / 3, s / 1.8)
          ctx.lineTo(-s / 4, s / 3); ctx.lineTo(-s / 2, s / 3)
          ctx.quadraticCurveTo(-s / 1.6, s / 3, -s / 1.6, s / 5)
          ctx.lineTo(-s / 1.6, -s / 6)
          ctx.quadraticCurveTo(-s / 1.6, -s / 3, -s / 2, -s / 3)
          ctx.fill(); ctx.stroke()
          ctx.strokeStyle = `rgba(${icon.color},${opacity * 2})`
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(-s / 3.5, -s / 8); ctx.lineTo(s / 3.5, -s / 8)
          ctx.moveTo(-s / 3.5, s / 10); ctx.lineTo(s / 6, s / 10)
          ctx.stroke()
          break
        }
      }
      ctx.restore()
    }

    const spawnParticles = () => {
      if (particles.length > 80) return
      const src = icons[Math.floor(Math.random() * icons.length)]
      for (let i = 0; i < 4; i++) {
        particles.push({
          x: src.x, y: src.y,
          vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
          life: 0, maxLife: 120 + Math.random() * 100,
          color: src.color, size: 1.5 + Math.random() * 2,
        })
      }
    }

    const draw = () => {
      time++
      ctx.clearRect(0, 0, w, h)

      if (time % 15 === 0) spawnParticles()

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx; p.y += p.vy; p.life++
        if (p.life > p.maxLife) { particles.splice(i, 1); continue }
        const alpha = (1 - p.life / p.maxLife) * 0.4
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color},${alpha})`
        ctx.fill()
      }

      for (let i = 0; i < icons.length; i++) {
        for (let j = i + 1; j < icons.length; j++) {
          const dx = icons[i].x - icons[j].x
          const dy = icons[i].y - icons[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 220) {
            const lineAlpha = (1 - dist / 220) * 0.08
            ctx.beginPath()
            ctx.moveTo(icons[i].x, icons[i].y)
            ctx.lineTo(icons[j].x, icons[j].y)
            const grad = ctx.createLinearGradient(icons[i].x, icons[i].y, icons[j].x, icons[j].y)
            grad.addColorStop(0, `rgba(${icons[i].color},${lineAlpha})`)
            grad.addColorStop(1, `rgba(${icons[j].color},${lineAlpha})`)
            ctx.strokeStyle = grad
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      for (const icon of icons) {
        icon.x += icon.vx; icon.y += icon.vy; icon.rotation += icon.rotSpeed
        if (icon.x < -60) icon.x = w + 60
        if (icon.x > w + 60) icon.x = -60
        if (icon.y < -60) icon.y = h + 60
        if (icon.y > h + 60) icon.y = -60
        drawIcon(icon)
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

/* ════════════════════════════════════════════
   MAIN LANDING PAGE
   ════════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter()
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activePlan, setActivePlan] = useState<"monthly" | "yearly">("yearly")

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const goLogin = () => router.push("/auth/login")
  const goRegister = () => router.push("/auth/register")

  return (
    <div className="min-h-screen bg-white text-ink font-sans antialiased">
      {/* ═══════════ HEADER ═══════════ */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] py-3"
            : "bg-transparent py-5"
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center shadow-lg shadow-primary/25">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              YO<span className="text-primary">.</span>dijital
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: "Özellikler", href: "#features" },
              { label: "Nasıl Çalışır", href: "#how-it-works" },
              { label: "Fiyatlandırma", href: "#pricing" },
              { label: "Referanslar", href: "#testimonials" },
            ].map((item) => (
              <a key={item.href} href={item.href} className="text-sm font-medium text-ink/70 hover:text-ink transition-colors">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={goLogin} className="text-sm font-medium text-ink/70 hover:text-ink transition-colors px-4 py-2">
              Giriş Yap
            </button>
            <button onClick={goRegister} className="landing-btn-primary text-sm">
              Ücretsiz Başla <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-surface-300 px-6 py-6 space-y-4 animate-slide-up">
            {["Özellikler", "Nasıl Çalışır", "Fiyatlandırma", "Referanslar"].map((label) => (
              <a key={label} href={`#${label.toLowerCase().replace(/\s/g, "-")}`} className="block text-sm font-medium text-ink/70" onClick={() => setMobileMenu(false)}>
                {label}
              </a>
            ))}
            <div className="pt-4 border-t border-surface-300 flex flex-col gap-3">
              <button onClick={goLogin} className="text-sm font-medium text-ink/70">Giriş Yap</button>
              <button onClick={goRegister} className="landing-btn-primary text-sm w-full justify-center">
                Ücretsiz Başla <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative pt-24 pb-8 md:pt-32 md:pb-10 overflow-hidden">
        {/* Canvas Animation Background */}
        <FloatingCanvas />

        <div className="absolute top-20 -left-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-accent-blue/6 rounded-full blur-3xl" />

        <div className="relative max-w-[1600px] mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary/15 mb-4 landing-reveal">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary-700">AI Destekli WhatsApp Business Platform</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-4 landing-reveal landing-reveal-delay-1">
              Müşterilerinizle{" "}
              <span className="landing-gradient-text">mesajlaşarak</span>
              <br />satışlarınızı katla
            </h1>

            <p className="text-lg md:text-xl text-ink/60 max-w-2xl mx-auto mb-6 leading-relaxed landing-reveal landing-reveal-delay-2">
              WhatsApp, Instagram ve tüm mesajlaşma kanallarınızı tek platformda yönetin.
              AI chatbot ile 7/24 müşterilerinize anında cevap verin.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 landing-reveal landing-reveal-delay-3">
              <button onClick={goRegister} className="landing-btn-primary text-base px-8 py-4">
                14 Gün Ücretsiz Deneyin <ArrowRight className="w-5 h-5" />
              </button>
              <a href="#how-it-works" className="landing-btn-secondary text-base px-8 py-4">
                <Play className="w-5 h-5" /> Nasıl Çalışır?
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-ink/40 landing-reveal landing-reveal-delay-3">
              <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><span>Meta İş Ortağı</span></div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4" /><span>Kredi kartı gerekmez</span></div>
              <div className="flex items-center gap-2"><Zap className="w-4 h-4" /><span>2 dakikada kurulum</span></div>
            </div>
          </div>

          {/* Hero Dashboard Mockup — wider */}
          <div className="mt-10 md:mt-12 landing-reveal landing-reveal-delay-3">
            <div className="relative max-w-[1400px] mx-auto">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent rounded-3xl blur-2xl scale-105" />

              <div className="relative bg-white rounded-2xl md:rounded-3xl shadow-[0_25px_80px_-12px_rgba(0,0,0,0.15)] border border-surface-300/50 overflow-hidden">
                {/* Window bar */}
                <div className="flex items-center gap-2 px-5 py-3 bg-surface-50 border-b border-surface-300/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-surface-150 rounded-lg py-1.5 px-4 text-xs text-ink/30 text-center max-w-xs mx-auto">
                      app.yodijital.com
                    </div>
                  </div>
                </div>

                <div className="flex min-h-[360px] md:min-h-[480px]">
                  {/* Sidebar */}
                  <div className="hidden md:flex flex-col w-56 bg-sidebar p-4 gap-1">
                    <div className="flex items-center gap-2 mb-6 px-2">
                      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold text-white">YO.dijital</span>
                    </div>
                    {[
                      { icon: MessageCircle, label: "Gelen Kutusu", active: true, badge: "12" },
                      { icon: Users, label: "Kişiler", active: false },
                      { icon: Send, label: "Toplu Mesaj", active: false },
                      { icon: Bot, label: "AI Chatbot", active: false },
                      { icon: Workflow, label: "Otomasyon", active: false },
                      { icon: BarChart3, label: "Raporlar", active: false },
                    ].map((item) => (
                      <div key={item.label} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs ${item.active ? "bg-sidebar-active text-white font-medium" : "text-sidebar-text"}`}>
                        <item.icon className="w-4 h-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge && <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{item.badge}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Chat List */}
                  <div className="hidden lg:flex flex-col w-80 border-r border-surface-300/50 bg-surface-50">
                    <div className="p-3 border-b border-surface-300/50">
                      <div className="bg-white rounded-lg px-3 py-2 text-xs text-ink/30 border border-surface-300/50">Konuşmalarda ara...</div>
                    </div>
                    {[
                      { name: "Ahmet Yılmaz", msg: "Ürün hakkında bilgi alabilir miyim?", time: "2dk", unread: true, channel: "whatsapp" },
                      { name: "Elif Kaya", msg: "Siparişim ne zaman gelir?", time: "15dk", unread: true, channel: "instagram" },
                      { name: "Mehmet Demir", msg: "Teşekkürler, harika hizmet!", time: "1sa", unread: false, channel: "whatsapp" },
                      { name: "Ayşe Çelik", msg: "Fiyat listesi gönderebilir misiniz?", time: "2sa", unread: false, channel: "whatsapp" },
                      { name: "Can Öztürk", msg: "Ödeme yaptım, kontrol eder misiniz?", time: "3sa", unread: false, channel: "facebook" },
                    ].map((chat, i) => (
                      <div key={i} className={`flex items-start gap-3 px-4 py-3 border-b border-surface-300/30 ${i === 0 ? "bg-primary-50/40" : "hover:bg-white"}`}>
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center text-white text-xs font-bold">{chat.name.charAt(0)}</div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${chat.channel === "whatsapp" ? "bg-green-500" : chat.channel === "instagram" ? "bg-pink-500" : "bg-blue-500"}`}>
                            {chat.channel === "whatsapp" && <Phone className="w-2 h-2 text-white" />}
                            {chat.channel === "instagram" && <Instagram className="w-2 h-2 text-white" />}
                            {chat.channel === "facebook" && <Facebook className="w-2 h-2 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${chat.unread ? "font-bold text-ink" : "font-medium text-ink/70"}`}>{chat.name}</span>
                            <span className="text-[10px] text-ink/40">{chat.time}</span>
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${chat.unread ? "text-ink/70 font-medium" : "text-ink/40"}`}>{chat.msg}</p>
                        </div>
                        {chat.unread && <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col bg-white">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-surface-300/50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center text-white text-xs font-bold">A</div>
                        <div>
                          <div className="text-sm font-semibold">Ahmet Yılmaz</div>
                          <div className="text-[10px] text-green-500 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Çevrimiçi
                          </div>
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded-md bg-green-50 text-[10px] text-green-700 font-medium flex items-center gap-1">
                        <Phone className="w-3 h-3" /> WhatsApp
                      </div>
                    </div>

                    <div className="flex-1 p-5 space-y-3 overflow-hidden">
                      <div className="flex gap-2 max-w-[80%]">
                        <div className="bg-surface-100 rounded-2xl rounded-tl-md px-4 py-2.5">
                          <p className="text-xs text-ink/80">Merhaba, premium paketiniz hakkında bilgi alabilir miyim? Fiyatları öğrenmek istiyorum.</p>
                          <span className="text-[9px] text-ink/30 mt-1 block">14:32</span>
                        </div>
                      </div>
                      <div className="flex gap-2 max-w-[80%] ml-auto flex-row-reverse">
                        <div className="bg-primary rounded-2xl rounded-tr-md px-4 py-2.5">
                          <div className="flex items-center gap-1 mb-1">
                            <Bot className="w-3 h-3 text-white/70" />
                            <span className="text-[9px] text-white/60 font-medium">AI Asistan</span>
                          </div>
                          <p className="text-xs text-white">Merhaba Ahmet! Premium paketimiz aylık 299₺ ile başlıyor. Sınırsız mesaj, AI chatbot ve 7/24 destek dahil. Detaylı bilgi göndereyim mi?</p>
                          <span className="text-[9px] text-white/40 mt-1 block text-right">14:32 ✓✓</span>
                        </div>
                      </div>
                      <div className="flex gap-2 max-w-[80%]">
                        <div className="bg-surface-100 rounded-2xl rounded-tl-md px-4 py-2.5">
                          <p className="text-xs text-ink/80">Evet lütfen! Ayrıca entegrasyonlar hakkında da bilgi verir misiniz?</p>
                          <span className="text-[9px] text-ink/30 mt-1 block">14:33</span>
                        </div>
                      </div>
                      <div className="flex gap-2 max-w-[80%] ml-auto flex-row-reverse">
                        <div className="bg-primary/10 rounded-2xl px-4 py-3 flex items-center gap-1">
                          <div className="landing-typing-dot" style={{ animationDelay: "0ms" }} />
                          <div className="landing-typing-dot" style={{ animationDelay: "150ms" }} />
                          <div className="landing-typing-dot" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 border-t border-surface-300/50">
                      <div className="flex items-center gap-2 bg-surface-50 rounded-xl px-4 py-2.5">
                        <span className="text-xs text-ink/30 flex-1">Mesaj yazın...</span>
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                          <Send className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS BAR ═══════════ */}
      <section className="py-8 bg-surface-50 border-y border-surface-300/50">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 5000, suffix: "+", label: "Aktif İşletme" },
              { value: 12, suffix: "M+", label: "Gönderilen Mesaj" },
              { value: 99, suffix: "%", label: "Uptime Garantisi" },
              { value: 45, suffix: "%", label: "Daha Fazla Satış" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-extrabold text-ink tracking-tight">
                  <Counter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-ink/50 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="py-10 md:py-14">
        <div className="max-w-[1600px] mx-auto px-6">
          <SectionHeader badge="Özellikler" title="İşletmenizi büyütecek her şey tek platformda" subtitle="WhatsApp, Instagram, Facebook Messenger ve daha fazlasını tek panelden yönetin. AI destekli otomasyonlarla müşteri deneyimini dönüştürün." />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
            {[
              { icon: MessageCircle, title: "Birleşik Gelen Kutusu", desc: "Tüm kanallardan gelen mesajları tek ekranda görün. WhatsApp, Instagram DM, Facebook Messenger hepsi bir arada.", color: "from-green-500 to-emerald-600" },
              { icon: Bot, title: "AI Chatbot", desc: "Gemini AI destekli chatbot ile 7/24 müşterilerinize anında yanıt verin. SSS, ürün önerisi, sipariş takibi otomatik.", color: "from-violet-500 to-purple-600" },
              { icon: Workflow, title: "Akış Oluşturucu", desc: "Sürükle-bırak ile görsel otomasyon akışları oluşturun. Kodsuz, sınırsız senaryo. Karşılama, takip, hatırlatma.", color: "from-blue-500 to-indigo-600" },
              { icon: Send, title: "Toplu Mesaj & Kampanya", desc: "Hedefli kampanyalar gönderin. Etiket bazlı segmentasyon, zamanlama, A/B test. Teslim ve okunma raporları anlık.", color: "from-orange-500 to-red-500" },
              { icon: BarChart3, title: "Detaylı Analitik", desc: "Konuşma metrikleri, yanıt süreleri, kampanya performansı, müşteri memnuniyeti — veriye dayalı kararlar alın.", color: "from-cyan-500 to-blue-600" },
              { icon: Users, title: "CRM & Pipeline", desc: "Müşteri profillerini, lead'leri ve satış pipeline'ını yönetin. Kanban görünüm, etiketler, özel alanlar.", color: "from-pink-500 to-rose-600" },
            ].map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="py-10 md:py-14 bg-gradient-to-b from-surface-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6">
          <SectionHeader badge="Nasıl Çalışır" title="3 adımda başlayın" subtitle="Dakikalar içinde tüm mesajlaşma kanallarınızı bağlayın ve müşterilerinizle iletişimi dönüştürün." />

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {[
              { step: "01", title: "WhatsApp'ı Bağlayın", desc: "Meta Business hesabınızla giriş yapın, WhatsApp Business API'nizi saniyeler içinde bağlayın. Embedded Signup ile tek tıkla.", icon: Phone },
              { step: "02", title: "AI Chatbot Kurun", desc: "Bilgi tabanınızı yükleyin, yanıt tonunu ayarlayın. AI chatbot müşterilerinize 7/24 otomatik yanıt vermeye başlasın.", icon: Bot },
              { step: "03", title: "Satışları Katlayın", desc: "Toplu mesajlar gönderin, kampanyalar oluşturun, pipeline'da lead'leri takip edin. Büyümeyi izleyin.", icon: BarChart3 },
            ].map((item, i) => (
              <StepCard key={item.step} {...item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ AI SHOWCASE ═══════════ */}
      <section className="py-10 md:py-14 overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 mb-5">
                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                <span className="text-xs font-semibold text-violet-700">AI Destekli</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-5">
                Yapay zeka ile <span className="landing-gradient-text">7/24 satış</span> yapın
              </h2>
              <p className="text-ink/60 leading-relaxed mb-6">
                Gemini AI destekli chatbot'unuz müşterilerinizin sorularını anında yanıtlar, ürün önerir, sipariş bilgisi verir ve satışa yönlendirir. Siz uyurken bile işletmeniz çalışmaya devam eder.
              </p>
              <div className="space-y-3">
                {[
                  "SSS'leri otomatik yanıtlar, ekibinizin yükünü %70 azaltır",
                  "Doğal dilde konuşur, müşteri memnuniyetini artırır",
                  "Bilgi tabanınızdan öğrenir, her gün daha akıllı olur",
                  "Gerektiğinde canlı temsilciye sorunsuz aktarır",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm text-ink/70">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-primary/10 rounded-3xl blur-3xl" />
              <div className="relative bg-white rounded-2xl shadow-elevated border border-surface-300/50 p-6">
                <div className="space-y-3">
                  <ChatBubble side="left" name="Müşteri" time="14:22">
                    Merhaba, XL beden siyah tişört stokta var mı?
                  </ChatBubble>
                  <ChatBubble side="right" name="AI Asistan" time="14:22" isBot>
                    Merhaba! Evet, XL beden siyah tişörtümüz stokta mevcut. Fiyatı 249₺. Sepetinize eklememi ister misiniz?
                  </ChatBubble>
                  <ChatBubble side="left" name="Müşteri" time="14:23">
                    Evet lütfen! Kargo ne kadar sürüyor?
                  </ChatBubble>
                  <ChatBubble side="right" name="AI Asistan" time="14:23" isBot>
                    Sepetinize ekledim! Kargo 1-3 iş günü içinde teslim edilir. Ödeme linkini göndermemi ister misiniz?
                  </ChatBubble>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="flex-1 h-px bg-surface-300/50" />
                    <span className="text-[10px] text-ink/30 font-medium">Satış tamamlandı — 12 saniyede</span>
                    <div className="flex-1 h-px bg-surface-300/50" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CHANNELS ═══════════ */}
      <section className="py-10 md:py-14 bg-gradient-to-b from-white via-surface-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6">
          <SectionHeader badge="Kanallar" title="Tüm mesajlaşma kanalları tek çatı altında" subtitle="Müşterileriniz nerede olursa olsun, onlara ulaşın. Tek gelen kutusu, tüm kanallar." />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
            {[
              { name: "WhatsApp Business", color: "bg-green-500", icon: Phone, desc: "API entegrasyonu" },
              { name: "Instagram DM", color: "bg-gradient-to-br from-purple-500 to-pink-500", icon: Instagram, desc: "Direkt mesajlar" },
              { name: "Facebook Messenger", color: "bg-blue-600", icon: Facebook, desc: "Sayfa mesajları" },
              { name: "Web Chat", color: "bg-primary", icon: Globe, desc: "Site widget'ı" },
            ].map((channel) => (
              <div key={channel.name} className="group relative bg-white rounded-2xl border border-surface-300/50 p-6 text-center hover:shadow-elevated hover:border-primary/20 transition-all duration-300 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl ${channel.color} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <channel.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-sm mb-1">{channel.name}</h3>
                <p className="text-xs text-ink/50">{channel.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="py-10 md:py-14">
        <div className="max-w-[1600px] mx-auto px-6">
          <SectionHeader badge="Fiyatlandırma" title="İşletmenize uygun planı seçin" subtitle="Tüm planlarda 14 gün ücretsiz deneme. Kredi kartı gerekmez." />

          <div className="flex items-center justify-center gap-3 mt-6 mb-8">
            <span className={`text-sm font-medium ${activePlan === "monthly" ? "text-ink" : "text-ink/40"}`}>Aylık</span>
            <button onClick={() => setActivePlan(activePlan === "monthly" ? "yearly" : "monthly")} className={`relative w-12 h-6 rounded-full transition-colors ${activePlan === "yearly" ? "bg-primary" : "bg-surface-350"}`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${activePlan === "yearly" ? "translate-x-6" : "translate-x-0.5"}`} />
            </button>
            <span className={`text-sm font-medium ${activePlan === "yearly" ? "text-ink" : "text-ink/40"}`}>Yıllık</span>
            <span className="text-xs font-bold text-primary bg-primary-50 px-2 py-1 rounded-full">%20 indirim</span>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { name: "Başlangıç", price: activePlan === "yearly" ? 799 : 999, desc: "Küçük işletmeler için ideal başlangıç", features: ["1.000 mesaj/ay", "1 WhatsApp numarası", "Temel AI chatbot", "3 kullanıcı", "Email destek"], cta: "Ücretsiz Deneyin", popular: false },
              { name: "Profesyonel", price: activePlan === "yearly" ? 1599 : 1999, desc: "Büyüyen işletmeler için tam donanım", features: ["10.000 mesaj/ay", "3 WhatsApp numarası", "Gelişmiş AI chatbot", "10 kullanıcı", "CRM & Pipeline", "Otomasyon & Akışlar", "Öncelikli destek"], cta: "Ücretsiz Deneyin", popular: true },
              { name: "Kurumsal", price: null, desc: "Yüksek hacimli ve özel ihtiyaçlar", features: ["Sınırsız mesaj", "Sınırsız numara", "Özel AI eğitimi", "Sınırsız kullanıcı", "API erişimi", "Özel entegrasyonlar", "Dedicated hesap yöneticisi"], cta: "İletişime Geçin", popular: false },
            ].map((plan) => (
              <PricingCard key={plan.name} {...plan} onAction={plan.price ? goRegister : undefined} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section id="testimonials" className="py-10 md:py-14 bg-gradient-to-b from-surface-50 to-white">
        <div className="max-w-[1600px] mx-auto px-6">
          <SectionHeader badge="Referanslar" title="Müşterilerimiz ne diyor?" subtitle="Binlerce işletme YO Dijital ile mesajlaşarak satışlarını artırıyor." />

          <div className="grid md:grid-cols-3 gap-5 mt-8">
            {[
              { quote: "WhatsApp üzerinden gelen müşteri sorularına AI chatbot sayesinde anında yanıt vermeye başladık. Müşteri memnuniyeti %40 arttı.", name: "Ahmet Yılmaz", role: "E-ticaret Müdürü", company: "TechStore" },
              { quote: "Toplu mesaj kampanyaları ile satışlarımız 3 ayda %60 arttı. Tek panelden tüm kanalları yönetmek inanılmaz kolaylık.", name: "Elif Kaya", role: "Pazarlama Direktörü", company: "ModeVita" },
              { quote: "Otomasyon akışları sayesinde 7/24 müşteri hizmeti sunabiliyoruz. Ekip verimliliği 3 kat arttı. Tavsiye ederim.", name: "Mehmet Demir", role: "Kurucu", company: "ServisPlus" },
            ].map((t) => (
              <TestimonialCard key={t.name} {...t} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="py-10 md:py-14 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-sidebar to-primary-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(17,157,88,0.15),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.1),transparent_70%)]" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-5">
            Müşterilerinizle konuşmaya<br />
            <span className="bg-gradient-to-r from-primary-300 to-primary-light bg-clip-text text-transparent">bugün başlayın</span>
          </h2>
          <p className="text-lg text-white/50 max-w-2xl mx-auto mb-8">
            14 gün boyunca tüm özellikleri ücretsiz deneyin. Kurulum 2 dakika, kredi kartı gerekmez.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={goRegister} className="bg-white text-ink font-bold px-8 py-4 rounded-xl text-base flex items-center gap-2 hover:bg-white/90 transition-colors shadow-lg">
              Ücretsiz Hesap Oluşturun <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={goLogin} className="text-white/60 hover:text-white font-medium px-8 py-4 text-base transition-colors">
              Zaten hesabınız var mı? Giriş yapın
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-white border-t border-surface-300/50 py-10">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-700 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">YO<span className="text-primary">.</span>dijital</span>
              </div>
              <p className="text-sm text-ink/50 leading-relaxed mb-4">AI destekli WhatsApp Business Platform. Mesajlaşarak satışlarınızı katlayın.</p>
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 rounded bg-green-50 border border-green-200">
                  <span className="text-[10px] font-bold text-green-700">Meta İş Ortağı</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4">Ürün</h4>
              <div className="space-y-2.5">
                {["Gelen Kutusu", "AI Chatbot", "Toplu Mesaj", "Otomasyon", "CRM Pipeline", "Analitik"].map((item) => (
                  <a key={item} href="#features" className="block text-sm text-ink/50 hover:text-ink transition-colors">{item}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4">Kanallar</h4>
              <div className="space-y-2.5">
                {["WhatsApp Business", "Instagram DM", "Facebook Messenger", "Web Chat Widget", "Telegram"].map((item) => (
                  <a key={item} href="#" className="block text-sm text-ink/50 hover:text-ink transition-colors">{item}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-4">Destek</h4>
              <div className="space-y-2.5">
                {["Yardım Merkezi", "API Dokümantasyon", "İletişim", "Gizlilik Politikası", "Kullanım Şartları"].map((item) => (
                  <a key={item} href="#" className="block text-sm text-ink/50 hover:text-ink transition-colors">{item}</a>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-surface-300/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs text-ink/30">© 2024-2026 YO Dijital. Tüm hakları saklıdır.</span>
            <div className="flex items-center gap-4">
              <a href="#" className="text-ink/30 hover:text-ink/60 transition-colors"><Instagram className="w-4 h-4" /></a>
              <a href="#" className="text-ink/30 hover:text-ink/60 transition-colors"><Facebook className="w-4 h-4" /></a>
              <a href="#" className="text-ink/30 hover:text-ink/60 transition-colors"><Mail className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════ */

function SectionHeader({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={`text-center max-w-3xl mx-auto transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary/15 mb-2">
        <span className="text-xs font-semibold text-primary-700">{badge}</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-2">{title}</h2>
      <p className="text-ink/50 leading-relaxed">{subtitle}</p>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={`group relative bg-white rounded-2xl border border-surface-300/50 p-6 hover:shadow-elevated hover:border-primary/15 transition-all duration-500 hover:-translate-y-1 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-ink/50 leading-relaxed">{desc}</p>
    </div>
  )
}

function StepCard({ step, title, desc, icon: Icon, index }: { step: string; title: string; desc: string; icon: any; index: number }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={`relative text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: `${index * 150}ms` }}>
      {index < 2 && <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary/20 to-primary/5" />}
      <div className="relative inline-flex mb-5">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center border border-primary/10">
          <Icon className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-primary/30">
          {step.replace("0", "")}
        </div>
      </div>
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-ink/50 leading-relaxed max-w-xs mx-auto">{desc}</p>
    </div>
  )
}

function ChatBubble({ side, name, time, children, isBot }: { side: "left" | "right"; name: string; time: string; children: React.ReactNode; isBot?: boolean }) {
  return (
    <div className={`flex gap-2 ${side === "right" ? "ml-auto flex-row-reverse max-w-[85%]" : "max-w-[85%]"}`}>
      <div className={`rounded-2xl px-4 py-3 ${side === "right" ? "bg-primary text-white rounded-tr-md" : "bg-surface-100 text-ink/80 rounded-tl-md"}`}>
        {isBot && (
          <div className="flex items-center gap-1 mb-1">
            <Bot className="w-3 h-3 text-white/60" />
            <span className="text-[10px] text-white/50 font-medium">{name}</span>
          </div>
        )}
        <p className="text-sm leading-relaxed">{children}</p>
        <span className={`text-[10px] mt-1 block ${side === "right" ? "text-white/40 text-right" : "text-ink/30"}`}>{time}</span>
      </div>
    </div>
  )
}

function PricingCard({ name, price, desc, features, cta, popular, onAction }: { name: string; price: number | null; desc: string; features: string[]; cta: string; popular: boolean; onAction?: () => void }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={`relative bg-white rounded-2xl border p-7 transition-all duration-700 ${popular ? "border-primary shadow-[0_8px_40px_-12px_rgba(17,157,88,0.25)] scale-[1.02]" : "border-surface-300/50 hover:shadow-elevated hover:border-primary/15"} ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      {popular && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-primary/30">En Popüler</div>}
      <h3 className="font-bold text-lg mb-1">{name}</h3>
      <p className="text-sm text-ink/50 mb-5">{desc}</p>
      <div className="mb-6">
        {price ? (
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight">{price.toLocaleString("tr-TR")}₺</span>
            <span className="text-sm text-ink/40">/ay</span>
          </div>
        ) : (
          <div className="text-4xl font-extrabold tracking-tight">Özel Teklif</div>
        )}
      </div>
      <button onClick={onAction} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${popular ? "bg-primary text-white hover:bg-primary-hover shadow-lg shadow-primary/20" : "bg-surface-50 text-ink hover:bg-surface-150 border border-surface-300"}`}>
        {cta} <ArrowRight className="w-4 h-4" />
      </button>
      <div className="mt-6 space-y-2.5">
        {features.map((f) => (
          <div key={f} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${popular ? "bg-primary/10" : "bg-surface-150"}`}>
              <Check className={`w-3 h-3 ${popular ? "text-primary" : "text-ink/40"}`} />
            </div>
            <span className="text-sm text-ink/60">{f}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TestimonialCard({ quote, name, role, company }: { quote: string; name: string; role: string; company: string }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={`bg-white rounded-2xl border border-surface-300/50 p-7 hover:shadow-elevated transition-all duration-700 hover:-translate-y-1 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      <div className="flex gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
      </div>
      <p className="text-sm text-ink/70 leading-relaxed mb-5 italic">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-200 to-primary-400 flex items-center justify-center text-white font-bold text-sm">{name.charAt(0)}</div>
        <div>
          <div className="font-bold text-sm">{name}</div>
          <div className="text-xs text-ink/40">{role}, {company}</div>
        </div>
      </div>
    </div>
  )
}
