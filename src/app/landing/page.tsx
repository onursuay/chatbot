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
  Linkedin,
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
   TRANSLATIONS
   ════════════════════════════════════════════ */
const T = {
  tr: {
    nav: ["Ürün", "Entegrasyonlar", "Fiyatlandırma"],
    navHrefs: ["#features", "#how-it-works", "#pricing"],
    login: "Giriş Yap",
    bookDemo: "Görüşme Planla",
    tryFree7: "7 Gün Ücretsiz Dene",
    heroBadge: "AI Destekli WhatsApp Business Platform",
    heroH1a: "Müşteri yönetiminde fark yaratan",
    heroH1b: "tüm stratejik araçlar ve akıllı çözümler",
    heroH1c: "artık tek merkezde buluşuyor.",
    heroCta1: "14 Gün Ücretsiz Deneyin",
    heroCta2: "Nasıl Çalışır?",
    trust1: "Meta İş Ortağı",
    trust2: "Kredi kartı gerekmez",
    trust3: "2 dakikada kurulum",
    sidebarMsgSection: "MESAJLAŞMA",
    sidebarInbox: "Gelen Kutusu",
    sidebarContacts: "Kişiler",
    sidebarTemplates: "Şablonlar",
    sidebarBulk: "Toplu Mesaj",
    sidebarAiSection: "YAPAY ZEKA",
    sidebarBot: "AI Sohbet Botu",
    sidebarAuto: "Otomasyonlar",
    sidebarFlow: "Akış Oluşturucu",
    sidebarIntSection: "ENTEGRASYON",
    sidebarChannels: "Kanallar",
    sidebarIntegrations: "Entegrasyonlar",
    sidebarAnalSection: "ANALİZ",
    sidebarReports: "Raporlar",
    searchPlaceholder: "Konuşmalarda ara...",
    msgOnline: "Çevrimiçi",
    msgTypePlaceholder: "Mesaj yazın...",
    chatContactName: "Ahmet Yılmaz",
    chatList: [
      { name: "Ahmet Yılmaz", msg: "Ürün hakkında bilgi alabilir miyim?", time: "2dk", unread: true, channel: "whatsapp" },
      { name: "Elif Kaya", msg: "Siparişim ne zaman gelir?", time: "15dk", unread: true, channel: "instagram" },
      { name: "Mehmet Demir", msg: "Teşekkürler, harika hizmet!", time: "1sa", unread: false, channel: "whatsapp" },
      { name: "Ayşe Çelik", msg: "Fiyat listesi gönderebilir misiniz?", time: "2sa", unread: false, channel: "whatsapp" },
      { name: "Can Öztürk", msg: "Ödeme yaptım, kontrol eder misiniz?", time: "3sa", unread: false, channel: "facebook" },
    ],
    chatMsg1: "Merhaba, premium paketiniz hakkında bilgi alabilir miyim? Fiyatları öğrenmek istiyorum.",
    chatMsg2: "Merhaba Ahmet! Premium paketimiz aylık 299₺ ile başlıyor. Sınırsız mesaj, AI chatbot ve 7/24 destek dahil. Detaylı bilgi göndereyim mi?",
    chatMsg3: "Evet lütfen! Ayrıca entegrasyonlar hakkında da bilgi verir misiniz?",
    chatAiLabel: "AI Asistan",
    statsItems: [
      { value: 5000, suffix: "+", label: "Aktif İşletme" },
      { value: 12, suffix: "M+", label: "Gönderilen Mesaj" },
      { value: 99, suffix: "%", label: "Uptime Garantisi" },
      { value: 45, suffix: "%", label: "Daha Fazla Satış" },
    ],
    featuresBadge: "Özellikler",
    featuresTitle: "İşletmenizi büyütecek her şey tek platformda",
    featuresSubtitle: "WhatsApp, Instagram, Facebook Messenger ve daha fazlasını tek panelden yönetin. AI destekli otomasyonlarla müşteri deneyimini dönüştürün.",
    features: [
      { title: "Akıllı Gelen Kutusu", desc: "WhatsApp, Instagram ve Facebook mesajlarınız tek ekranda. Müşterilerinize hangi kanaldan yazarsa yazsın, buradan anında yanıt verin. Okundu bilgisi, dosya paylaşımı ve AI destekli hızlı yanıtlar.", color: "from-green-500 to-emerald-600" },
      { title: "AI Sohbet Botu", desc: "Bilgi Bankası'na ürün, hizmet ve fiyat bilgilerinizi ekleyin. AI chatbot 7/24 müşterilerinize doğru ve tutarlı yanıtlar versin. Mesai dışında bile müşteri kaybetmeyin.", color: "from-violet-500 to-purple-600" },
      { title: "CRM & Pipeline", desc: "Müşteri adaylarınızı Kanban tahtasında sürükle-bırak ile yönetin. Her lead'in hangi aşamada olduğunu görün, teklif değerlerini takip edin. Kişi ve şirket bağlayarak satış sürecinizi kontrol edin.", color: "from-blue-500 to-indigo-600" },
      { title: "Toplu Mesaj Gönderimi", desc: "Onaylanmış WhatsApp şablonlarıyla binlerce müşterinize tek tıkla kişiselleştirilmiş mesajlar gönderin. Etiket bazlı filtreleme ile doğru kitleye ulaşın. Gönderim ve okunma oranlarını anlık takip edin.", color: "from-amber-500 to-orange-600" },
      { title: "Otomasyon & Akış Oluşturucu", desc: "Sürükle-bırak ile görsel otomasyon akışları oluşturun. Karşılama mesajı, takip hatırlatması, etiketleme — kodsuz sınırsız senaryo. Müşteri yolculuğunu otomatikleştirin.", color: "from-pink-500 to-rose-600" },
      { title: "Analiz & Raporlar", desc: "Mesajlaşma performansınızı detaylı grafiklerle görün. Gelen-giden mesaj sayıları, bot çözüm oranı, kampanya başarısı ve kanal bazlı karşılaştırmalar ile veriye dayalı kararlar alın.", color: "from-cyan-500 to-blue-600" },
    ],
    howBadge: "Nasıl Çalışır",
    howTitle: "3 adımda başlayın",
    howSubtitle: "Dakikalar içinde tüm mesajlaşma kanallarınızı bağlayın ve müşterilerinizle iletişimi dönüştürün.",
    steps: [
      { step: "01", title: "WhatsApp'ı Bağlayın", desc: "Meta Business hesabınızla giriş yapın, WhatsApp Business API'nizi saniyeler içinde bağlayın. Embedded Signup ile tek tıkla." },
      { step: "02", title: "AI Chatbot Kurun", desc: "Bilgi tabanınızı yükleyin, yanıt tonunu ayarlayın. AI chatbot müşterilerinize 7/24 otomatik yanıt vermeye başlasın." },
      { step: "03", title: "Satışları Katlayın", desc: "Toplu mesajlar gönderin, kampanyalar oluşturun, pipeline'da lead'leri takip edin. Büyümeyi izleyin." },
    ],
    aiBadge: "AI Destekli",
    aiTitleLine1: "Yapay zeka ile",
    aiTitleGradient: "7/24 satış",
    aiTitleLine2: "yapın",
    aiDesc: "Gemini AI destekli chatbot'unuz müşterilerinizin sorularını anında yanıtlar, ürün önerir, sipariş bilgisi verir ve satışa yönlendirir. Siz uyurken bile işletmeniz çalışmaya devam eder.",
    aiBullets: [
      "SSS'leri otomatik yanıtlar, ekibinizin yükünü %70 azaltır",
      "Doğal dilde konuşur, müşteri memnuniyetini artırır",
      "Bilgi tabanınızdan öğrenir, her gün daha akıllı olur",
      "Gerektiğinde canlı temsilciye sorunsuz aktarır",
    ],
    aiChat1: "Merhaba, XL beden siyah tişört stokta var mı?",
    aiChat2: "Merhaba! Evet, XL beden siyah tişörtümüz stokta mevcut. Fiyatı 249₺. Sepetinize eklememi ister misiniz?",
    aiChat3: "Evet lütfen! Kargo ne kadar sürüyor?",
    aiChat4: "Sepetinize ekledim! Kargo 1-3 iş günü içinde teslim edilir. Ödeme linkini göndermemi ister misiniz?",
    aiSaleComplete: "Satış tamamlandı — 12 saniyede",
    aiCustomer: "Müşteri",
    aiAssistant: "AI Asistan",
    channelsBadge: "Kanallar",
    channelsTitle: "Tüm mesajlaşma kanalları tek çatı altında",
    channelsSubtitle: "Müşterileriniz nerede olursa olsun, onlara ulaşın. Tek gelen kutusu, tüm kanallar.",
    channels: [
      { name: "WhatsApp Business", color: "bg-green-500", desc: "API entegrasyonu" },
      { name: "Instagram DM", color: "bg-gradient-to-br from-purple-500 to-pink-500", desc: "Direkt mesajlar" },
      { name: "Facebook Messenger", color: "bg-blue-600", desc: "Sayfa mesajları" },
      { name: "Web Chat", color: "bg-primary", desc: "Site widget'ı" },
    ],
    pricingBadge: "Fiyatlandırma",
    pricingTitle: "İşletmenize uygun planı seçin",
    pricingSubtitle: "Tüm planlarda 14 gün ücretsiz deneme. Kredi kartı gerekmez.",
    periods: [
      { label: "6 Ay", key: "6ay" as const },
      { label: "1 Yıl", key: "1yil" as const },
      { label: "2 Yıl", key: "2yil" as const },
    ],
    mostPopular: "En Popüler",
    tryForFree: "Ücretsiz Deneyin",
    contactSales: "Satış Ekibiyle Görüşün",
    contactUs: "Bize Ulaşın",
    perMonth: "/ay",
    plans: [
      { name: "Temel", desc: "Küçük işletmeler için temel iletişim araçları", features: ["1 WhatsApp numarası", "Sohbet gelen kutusu", "Temel AI özeti", "1 kullanıcı", "Email destek"] },
      { name: "Gelişmiş", desc: "Otomasyon ve toplu mesaj ile büyüme", features: ["2 WhatsApp numarası", "Toplu mesaj gönderimi", "Bot oluşturucu", "AI temsilcisi", "3 kullanıcı", "Otomasyon kuralları"] },
      { name: "Profesyonel", desc: "Tam CRM, gelişmiş AI ve analitik", features: ["5 WhatsApp numarası", "CRM & Pipeline", "Akış oluşturucu", "AI önerilen yanıtlar", "10 kullanıcı", "Detaylı analitik", "Öncelikli destek"] },
      { name: "Kurumsal", desc: "Özel ihtiyaçlar ve yüksek hacim", features: ["Sınırsız numara", "Özel AI eğitimi", "Sınırsız kullanıcı", "SSO & kurumsal güvenlik", "API erişimi", "SLA garantisi", "Dedicated hesap yöneticisi"] },
    ],
    compareDesc: "AI otomasyonunun seviyesine ve ekibinizin ihtiyaç duyduğu desteğe göre bir plan seçin ve işiniz büyüdükçe ölçeklendirin.",
    compareToggle: "Ayrıntılı Plan Karşılaştırmasını Görüntüleyin",
    compareFeature: "Özellik",
    compareTable: [
      { label: "WhatsApp numarası", vals: ["1", "2", "5", "Sınırsız"] },
      { label: "Kullanıcı sayısı", vals: ["1", "3", "10", "Sınırsız"] },
      { label: "Aylık mesaj", vals: ["1.000", "5.000", "25.000", "Sınırsız"] },
      { section: "Mesajlaşma" },
      { label: "Gelen kutusu", vals: [true, true, true, true] },
      { label: "Toplu mesaj", vals: [false, true, true, true] },
      { label: "Mesaj şablonları", vals: [true, true, true, true] },
      { label: "Dosya & medya paylaşımı", vals: [true, true, true, true] },
      { section: "CRM" },
      { label: "Pipeline yönetimi", vals: [false, false, true, true] },
      { label: "Lead yönetimi", vals: [false, false, true, true] },
      { label: "Şirket yönetimi", vals: [false, false, true, true] },
      { label: "Özel alanlar", vals: [false, false, true, true] },
      { section: "Yapay Zeka" },
      { label: "AI chatbot", vals: ["Temel", "Gelişmiş", "Pro", "Özel"] },
      { label: "AI önerilen yanıtlar", vals: [false, false, true, true] },
      { label: "Bilgi bankası", vals: [false, true, true, true] },
      { label: "Özel AI eğitimi", vals: [false, false, false, true] },
      { section: "Otomasyon" },
      { label: "Otomasyon kuralları", vals: [false, true, true, true] },
      { label: "Akış oluşturucu", vals: [false, false, true, true] },
      { label: "Webhook entegrasyonu", vals: [false, false, true, true] },
      { section: "Analitik & Destek" },
      { label: "Temel raporlar", vals: [true, true, true, true] },
      { label: "Detaylı analitik", vals: [false, false, true, true] },
      { label: "API erişimi", vals: [false, false, true, true] },
      { label: "Destek seviyesi", vals: ["Email", "Email", "Öncelikli", "Dedicated"] },
      { label: "SSO & kurumsal güvenlik", vals: [false, false, false, true] },
    ] as Array<{ section: string } | { label: string; vals: (boolean | string)[] }>,
    pricingCtaText: "14 günlük denemenizde tüm özelliklere tam erişim. Kredi kartı gerekmez.",
    pricingCtaBtn: "Ücretsiz Deneyin",
    testimonialsBadge: "Referanslar",
    testimonialsTitle: "Müşterilerimiz ne diyor?",
    testimonialsSubtitle: "Binlerce işletme YO Dijital ile mesajlaşarak satışlarını artırıyor.",
    testimonials: [
      { quote: "WhatsApp üzerinden gelen müşteri sorularına AI chatbot sayesinde anında yanıt vermeye başladık. Müşteri memnuniyeti %40 arttı.", name: "Ahmet Yılmaz", role: "E-ticaret Müdürü", company: "TechStore" },
      { quote: "Toplu mesaj kampanyaları ile satışlarımız 3 ayda %60 arttı. Tek panelden tüm kanalları yönetmek inanılmaz kolaylık.", name: "Elif Kaya", role: "Pazarlama Direktörü", company: "ModeVita" },
      { quote: "Otomasyon akışları sayesinde 7/24 müşteri hizmeti sunabiliyoruz. Ekip verimliliği 3 kat arttı. Tavsiye ederim.", name: "Mehmet Demir", role: "Kurucu", company: "ServisPlus" },
    ],
    ctaTitle1: "Müşterilerinizle konuşmaya",
    ctaTitle2: "bugün başlayın",
    ctaDesc: "14 gün boyunca tüm özellikleri ücretsiz deneyin. Kurulum 2 dakika, kredi kartı gerekmez.",
    ctaBtn1: "Ücretsiz Hesap Oluşturun",
    ctaBtn2: "Zaten hesabınız var mı? Giriş yapın",
    copyright: "2025 YO Dijital. Tüm hakları saklıdır.",
  },
  en: {
    nav: ["Product", "Integrations", "Pricing"],
    navHrefs: ["#features", "#how-it-works", "#pricing"],
    login: "Sign In",
    bookDemo: "Book a Demo",
    tryFree7: "Try 7 Days Free",
    heroBadge: "AI-Powered WhatsApp Business Platform",
    heroH1a: "All the strategic tools and smart solutions",
    heroH1b: "that make a real difference in customer management",
    heroH1c: "now in one central hub.",
    heroCta1: "Start 14-Day Free Trial",
    heroCta2: "How It Works?",
    trust1: "Meta Business Partner",
    trust2: "No credit card required",
    trust3: "2-minute setup",
    sidebarMsgSection: "MESSAGING",
    sidebarInbox: "Inbox",
    sidebarContacts: "Contacts",
    sidebarTemplates: "Templates",
    sidebarBulk: "Bulk Message",
    sidebarAiSection: "AI",
    sidebarBot: "AI Chatbot",
    sidebarAuto: "Automations",
    sidebarFlow: "Flow Builder",
    sidebarIntSection: "INTEGRATIONS",
    sidebarChannels: "Channels",
    sidebarIntegrations: "Integrations",
    sidebarAnalSection: "ANALYTICS",
    sidebarReports: "Reports",
    searchPlaceholder: "Search conversations...",
    msgOnline: "Online",
    msgTypePlaceholder: "Type a message...",
    chatContactName: "Ahmet Yılmaz",
    chatList: [
      { name: "Ahmet Yılmaz", msg: "Can I get info about the product?", time: "2m", unread: true, channel: "whatsapp" },
      { name: "Elif Kaya", msg: "When will my order arrive?", time: "15m", unread: true, channel: "instagram" },
      { name: "Mehmet Demir", msg: "Thank you, great service!", time: "1h", unread: false, channel: "whatsapp" },
      { name: "Ayşe Çelik", msg: "Can you send the price list?", time: "2h", unread: false, channel: "whatsapp" },
      { name: "Can Öztürk", msg: "I paid, can you check?", time: "3h", unread: false, channel: "facebook" },
    ],
    chatMsg1: "Hi, can I get information about your premium package? I'd like to know the pricing.",
    chatMsg2: "Hello Ahmet! Our premium package starts at $299/month. Unlimited messages, AI chatbot, and 24/7 support included. Shall I send you the details?",
    chatMsg3: "Yes please! Can you also tell me about the integrations?",
    chatAiLabel: "AI Assistant",
    statsItems: [
      { value: 5000, suffix: "+", label: "Active Businesses" },
      { value: 12, suffix: "M+", label: "Messages Sent" },
      { value: 99, suffix: "%", label: "Uptime Guarantee" },
      { value: 45, suffix: "%", label: "More Sales" },
    ],
    featuresBadge: "Features",
    featuresTitle: "Everything to grow your business in one platform",
    featuresSubtitle: "Manage WhatsApp, Instagram, Facebook Messenger and more from one dashboard. Transform the customer experience with AI-powered automations.",
    features: [
      { title: "Smart Inbox", desc: "Your WhatsApp, Instagram and Facebook messages in one screen. Reply instantly no matter which channel your customers write from. Read receipts, file sharing, and AI-powered quick replies.", color: "from-green-500 to-emerald-600" },
      { title: "AI Chatbot", desc: "Add your products, services, and pricing to the Knowledge Base. Let the AI chatbot give accurate and consistent answers 24/7. Never lose a customer outside working hours.", color: "from-violet-500 to-purple-600" },
      { title: "CRM & Pipeline", desc: "Manage your leads with drag-and-drop on a Kanban board. See which stage each lead is at, track deal values. Link contacts and companies to control your sales process.", color: "from-blue-500 to-indigo-600" },
      { title: "Bulk Messaging", desc: "Send personalized messages to thousands of customers with one click using approved WhatsApp templates. Reach the right audience with tag-based filtering. Track send and open rates in real time.", color: "from-amber-500 to-orange-600" },
      { title: "Automation & Flow Builder", desc: "Create visual automation flows with drag-and-drop. Welcome messages, follow-up reminders, tagging — unlimited scenarios without code. Automate the customer journey.", color: "from-pink-500 to-rose-600" },
      { title: "Analytics & Reports", desc: "View your messaging performance with detailed charts. Make data-driven decisions with inbound/outbound counts, bot resolution rate, campaign success, and channel comparisons.", color: "from-cyan-500 to-blue-600" },
    ],
    howBadge: "How It Works",
    howTitle: "Get started in 3 steps",
    howSubtitle: "Connect all your messaging channels in minutes and transform your customer communication.",
    steps: [
      { step: "01", title: "Connect WhatsApp", desc: "Sign in with your Meta Business account, connect your WhatsApp Business API in seconds. One click with Embedded Signup." },
      { step: "02", title: "Set Up AI Chatbot", desc: "Upload your knowledge base, adjust the response tone. Let the AI chatbot start giving automated replies 24/7." },
      { step: "03", title: "Multiply Your Sales", desc: "Send bulk messages, create campaigns, track leads in the pipeline. Watch your growth." },
    ],
    aiBadge: "AI-Powered",
    aiTitleLine1: "Sell",
    aiTitleGradient: "24/7 with AI",
    aiTitleLine2: "",
    aiDesc: "Your Gemini AI-powered chatbot instantly answers customer questions, recommends products, provides order info, and drives sales. Your business keeps working even while you sleep.",
    aiBullets: [
      "Automatically answers FAQs, reducing your team's workload by 70%",
      "Speaks naturally, improving customer satisfaction",
      "Learns from your knowledge base, gets smarter every day",
      "Seamlessly transfers to a live agent when needed",
    ],
    aiChat1: "Hi, do you have the black t-shirt in XL in stock?",
    aiChat2: "Hello! Yes, our black XL t-shirt is in stock. It's $24.99. Would you like me to add it to your cart?",
    aiChat3: "Yes please! How long does shipping take?",
    aiChat4: "Added to your cart! Shipping is 1-3 business days. Would you like me to send you the payment link?",
    aiSaleComplete: "Sale completed — in 12 seconds",
    aiCustomer: "Customer",
    aiAssistant: "AI Assistant",
    channelsBadge: "Channels",
    channelsTitle: "All messaging channels under one roof",
    channelsSubtitle: "Reach your customers wherever they are. One inbox, all channels.",
    channels: [
      { name: "WhatsApp Business", color: "bg-green-500", desc: "API integration" },
      { name: "Instagram DM", color: "bg-gradient-to-br from-purple-500 to-pink-500", desc: "Direct messages" },
      { name: "Facebook Messenger", color: "bg-blue-600", desc: "Page messages" },
      { name: "Web Chat", color: "bg-primary", desc: "Website widget" },
    ],
    pricingBadge: "Pricing",
    pricingTitle: "Choose the right plan for your business",
    pricingSubtitle: "14-day free trial on all plans. No credit card required.",
    periods: [
      { label: "6 Months", key: "6ay" as const },
      { label: "1 Year", key: "1yil" as const },
      { label: "2 Years", key: "2yil" as const },
    ],
    mostPopular: "Most Popular",
    tryForFree: "Try for Free",
    contactSales: "Contact Sales",
    contactUs: "Contact Us",
    perMonth: "/mo",
    plans: [
      { name: "Basic", desc: "Essential communication tools for small businesses", features: ["1 WhatsApp number", "Conversation inbox", "Basic AI summary", "1 user", "Email support"] },
      { name: "Advanced", desc: "Grow with automation and bulk messaging", features: ["2 WhatsApp numbers", "Bulk messaging", "Bot builder", "AI agent", "3 users", "Automation rules"] },
      { name: "Professional", desc: "Full CRM, advanced AI and analytics", features: ["5 WhatsApp numbers", "CRM & Pipeline", "Flow builder", "AI suggested replies", "10 users", "Detailed analytics", "Priority support"] },
      { name: "Enterprise", desc: "Custom needs and high volume", features: ["Unlimited numbers", "Custom AI training", "Unlimited users", "SSO & enterprise security", "API access", "SLA guarantee", "Dedicated account manager"] },
    ],
    compareDesc: "Choose a plan based on the level of AI automation and the support your team needs, and scale as your business grows.",
    compareToggle: "View Detailed Plan Comparison",
    compareFeature: "Feature",
    compareTable: [
      { label: "WhatsApp numbers", vals: ["1", "2", "5", "Unlimited"] },
      { label: "Users", vals: ["1", "3", "10", "Unlimited"] },
      { label: "Monthly messages", vals: ["1,000", "5,000", "25,000", "Unlimited"] },
      { section: "Messaging" },
      { label: "Inbox", vals: [true, true, true, true] },
      { label: "Bulk messaging", vals: [false, true, true, true] },
      { label: "Message templates", vals: [true, true, true, true] },
      { label: "File & media sharing", vals: [true, true, true, true] },
      { section: "CRM" },
      { label: "Pipeline management", vals: [false, false, true, true] },
      { label: "Lead management", vals: [false, false, true, true] },
      { label: "Company management", vals: [false, false, true, true] },
      { label: "Custom fields", vals: [false, false, true, true] },
      { section: "Artificial Intelligence" },
      { label: "AI chatbot", vals: ["Basic", "Advanced", "Pro", "Custom"] },
      { label: "AI suggested replies", vals: [false, false, true, true] },
      { label: "Knowledge base", vals: [false, true, true, true] },
      { label: "Custom AI training", vals: [false, false, false, true] },
      { section: "Automation" },
      { label: "Automation rules", vals: [false, true, true, true] },
      { label: "Flow builder", vals: [false, false, true, true] },
      { label: "Webhook integration", vals: [false, false, true, true] },
      { section: "Analytics & Support" },
      { label: "Basic reports", vals: [true, true, true, true] },
      { label: "Detailed analytics", vals: [false, false, true, true] },
      { label: "API access", vals: [false, false, true, true] },
      { label: "Support level", vals: ["Email", "Email", "Priority", "Dedicated"] },
      { label: "SSO & enterprise security", vals: [false, false, false, true] },
    ] as Array<{ section: string } | { label: string; vals: (boolean | string)[] }>,
    pricingCtaText: "Full access to all features during your 14-day trial. No credit card required.",
    pricingCtaBtn: "Try for Free",
    testimonialsBadge: "Testimonials",
    testimonialsTitle: "What do our customers say?",
    testimonialsSubtitle: "Thousands of businesses are increasing their sales by messaging with YO Dijital.",
    testimonials: [
      { quote: "We started responding instantly to customer questions coming through WhatsApp thanks to the AI chatbot. Customer satisfaction increased by 40%.", name: "Ahmet Yılmaz", role: "E-commerce Manager", company: "TechStore" },
      { quote: "Our sales increased by 60% in 3 months with bulk message campaigns. Managing all channels from one panel is incredibly easy.", name: "Elif Kaya", role: "Marketing Director", company: "ModeVita" },
      { quote: "Thanks to automation flows, we can provide 24/7 customer service. Team efficiency tripled. Highly recommend.", name: "Mehmet Demir", role: "Founder", company: "ServisPlus" },
    ],
    ctaTitle1: "Start talking to your",
    ctaTitle2: "customers today",
    ctaDesc: "Try all features free for 14 days. 2-minute setup, no credit card required.",
    ctaBtn1: "Create Free Account",
    ctaBtn2: "Already have an account? Sign in",
    copyright: "2025 YO Dijital. All rights reserved.",
  },
}

/* ════════════════════════════════════════════
   MAIN LANDING PAGE
   ════════════════════════════════════════════ */
export default function LandingPage() {
  const router = useRouter()
  const [mobileMenu, setMobileMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activePlan, setActivePlan] = useState<"6ay" | "1yil" | "2yil">("1yil")
  const [compareOpen, setCompareOpen] = useState(false)
  const [lang, setLang] = useState<"tr" | "en">("tr")
  const [dropOpen, setDropOpen] = useState(false)

  const t = T[lang]
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const headerRef = useRef<HTMLDivElement>(null)

  const handleMenuEnter = (menu: string) => {
    if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current)
    setOpenMenu(menu)
  }
  const handleMenuLeave = () => {
    menuTimeoutRef.current = setTimeout(() => setOpenMenu(null), 200)
  }

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpenMenu(null)
    }
    document.addEventListener("click", fn)
    return () => document.removeEventListener("click", fn)
  }, [])

  const langMeta = {
    tr: { flag: "🇹🇷", label: "Türkçe" },
    en: { flag: "🇬🇧", label: "English" },
  }

  const legalLinks = lang === "tr"
    ? [
        { label: "Gizlilik Politikası", href: "/tr/privacy-policy" },
        { label: "Kullanım Koşulları", href: "/tr/terms-of-service" },
        { label: "Çerez Politikası", href: "/tr/cookie-policy" },
        { label: "Veri Silme", href: "/tr/data-deletion" },
      ]
    : [
        { label: "Privacy Policy", href: "/en/privacy-policy" },
        { label: "Terms of Service", href: "/en/terms-of-service" },
        { label: "Cookie Policy", href: "/en/cookie-policy" },
        { label: "Data Deletion", href: "/en/data-deletion" },
      ]

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const goLogin = () => router.push("/auth/login")
  const goRegister = () => router.push("/auth/register")

  return (
    <div className="min-h-screen bg-[#060609] text-white font-sans antialiased overflow-x-hidden">
      {/* ═══════════ HEADER ═══════════ */}
      <header className="w-full sticky top-0 z-50 bg-[#060609]/80 backdrop-blur-2xl" ref={headerRef}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">

          {/* Logo */}
          <a href="/" className="shrink-0">
            <img src="/logo-yo.png" alt="YO Dijital" width={56} height={22} className="object-contain brightness-0 invert" style={{ height: "22px", width: "auto" }} />
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-2">

            {/* Ürün / Product */}
            <div className="relative" onMouseEnter={() => handleMenuEnter("product")} onMouseLeave={handleMenuLeave}>
              <button className="text-[14px] font-medium border border-emerald-400/30 text-emerald-400 px-5 py-2 rounded-full transition-colors hover:bg-emerald-400/10 flex items-center gap-1.5 cursor-pointer">
                {lang === "tr" ? "Ürün" : "Product"}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {openMenu === "product" && (
                <div className="absolute top-full left-0 mt-2 w-[560px] bg-[#1a1d21] border border-white/[0.06] rounded-2xl p-4 shadow-2xl shadow-black/50" onMouseEnter={() => handleMenuEnter("product")} onMouseLeave={handleMenuLeave}>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: "inbox", label: { tr: "Gelen Kutusu", en: "Smart Inbox" }, desc: { tr: "WhatsApp, Instagram ve Facebook mesajlarını tek ekrandan yönet", en: "Manage WhatsApp, Instagram, Facebook from one screen" }, href: "#features" },
                      { icon: "bot", label: { tr: "AI Chatbot", en: "AI Chatbot" }, desc: { tr: "7/24 otomatik yanıt veren yapay zeka asistanı", en: "AI assistant answering 24/7 automatically" }, href: "#features" },
                      { icon: "crm", label: { tr: "CRM & Pipeline", en: "CRM & Pipeline" }, desc: { tr: "Lead yönetimi ve Kanban panosu ile satışları takip et", en: "Track sales with lead management and Kanban board" }, href: "#features" },
                      { icon: "broadcast", label: { tr: "Toplu Mesaj", en: "Bulk Messaging" }, desc: { tr: "Binlerce müşteriye tek tıkla kişiselleştirilmiş mesaj gönder", en: "Send personalized messages to thousands in one click" }, href: "#features" },
                      { icon: "flow", label: { tr: "Otomasyon", en: "Automation" }, desc: { tr: "Sürükle-bırak ile görsel otomasyon akışları oluştur", en: "Build visual automation flows with drag-and-drop" }, href: "#features" },
                      { icon: "analytics", label: { tr: "Analiz", en: "Analytics" }, desc: { tr: "Mesajlaşma performansını detaylı raporlarla izle", en: "Track messaging performance with detailed reports" }, href: "#features" },
                    ].map((item, i) => {
                      const svgPaths: Record<string, string> = {
                        inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>',
                        bot: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>',
                        crm: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
                        broadcast: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.82 19.79 19.79 0 01.11 2.2 2 2 0 012.1 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92v2z"/>',
                        flow: '<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>',
                        analytics: '<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>',
                      }
                      return (
                        <a key={i} href={item.href} className="flex flex-col gap-1 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center gap-2 text-gray-200 group-hover:text-emerald-400 transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: svgPaths[item.icon] }} />
                            <span className="text-[13px] font-semibold">{lang === "tr" ? item.label.tr : item.label.en}</span>
                          </div>
                          <p className="text-[12.5px] text-[#8a8f98] leading-relaxed">{lang === "tr" ? item.desc.tr : item.desc.en}</p>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Entegrasyonlar / Integrations */}
            <div className="relative" onMouseEnter={() => handleMenuEnter("integrations")} onMouseLeave={handleMenuLeave}>
              <button className="text-[14px] font-medium border border-emerald-400/30 text-emerald-400 px-5 py-2 rounded-full transition-colors hover:bg-emerald-400/10 flex items-center gap-1.5 cursor-pointer">
                {lang === "tr" ? "Entegrasyonlar" : "Integrations"}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {openMenu === "integrations" && (
                <div className="absolute top-full left-0 mt-2 w-[480px] bg-[#1a1d21] border border-white/[0.06] rounded-2xl p-4 shadow-2xl shadow-black/50" onMouseEnter={() => handleMenuEnter("integrations")} onMouseLeave={handleMenuLeave}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: "whatsapp", label: { tr: "WhatsApp Business", en: "WhatsApp Business" }, desc: { tr: "Meta WABA entegrasyonu ile mesajlaşmayı otomatikleştir", en: "Automate messaging with Meta WABA integration" }, href: "#channels" },
                      { icon: "instagram", label: { tr: "Instagram DM", en: "Instagram DM" }, desc: { tr: "Instagram direkt mesajlarını tek yerden yönet", en: "Manage Instagram direct messages in one place" }, href: "#channels" },
                      { icon: "facebook", label: { tr: "Facebook Messenger", en: "Facebook Messenger" }, desc: { tr: "Facebook sayfa mesajlarını merkezi panelden takip et", en: "Track Facebook page messages from central dashboard" }, href: "#channels" },
                      { icon: "webchat", label: { tr: "Web Chat", en: "Web Chat" }, desc: { tr: "Web sitenize sohbet widget'ı ekle", en: "Add a chat widget to your website" }, href: "#channels" },
                    ].map((item, i) => {
                      const svgPaths: Record<string, string> = {
                        whatsapp: '<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>',
                        instagram: '<rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>',
                        facebook: '<path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>',
                        webchat: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
                      }
                      return (
                        <a key={i} href={item.href} className="flex flex-col gap-1 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group">
                          <div className="flex items-center gap-2 text-gray-200 group-hover:text-emerald-400 transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: svgPaths[item.icon] }} />
                            <span className="text-[13px] font-semibold">{lang === "tr" ? item.label.tr : item.label.en}</span>
                          </div>
                          <p className="text-[12.5px] text-[#8a8f98] leading-relaxed">{lang === "tr" ? item.desc.tr : item.desc.en}</p>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Fiyatlandırma / Pricing */}
            <a href="#pricing" className="text-[14px] font-medium border border-emerald-400/30 text-emerald-400 px-5 py-2 rounded-full transition-colors hover:bg-emerald-400/10">
              {lang === "tr" ? "Fiyatlandırma" : "Pricing"}
            </a>
          </nav>

          {/* Right CTAs */}
          <div className="flex items-center gap-2.5">
            <button onClick={goLogin} className="hidden lg:inline-flex text-[14px] font-medium text-gray-400 hover:text-white px-3 py-2 transition-colors">
              {t.login}
            </button>
            <button
              onClick={goRegister}
              className="hidden lg:inline-flex text-[14px] font-medium border border-emerald-400/30 text-emerald-400 px-5 py-2 rounded-full transition-colors hover:bg-emerald-400/10 cursor-pointer"
            >
              {t.bookDemo}
            </button>
            <button
              onClick={goRegister}
              className="text-[14px] font-medium border border-emerald-400/30 text-emerald-400 px-5 py-2 rounded-full transition-colors bg-emerald-400/10 hover:bg-emerald-400/15 cursor-pointer"
            >
              {t.tryFree7}
            </button>
            {/* Mobile Toggle */}
            <button className="lg:hidden p-2 text-white" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Bottom gradient line */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

        {/* Mobile Menu */}
        {mobileMenu && (
          <div className="lg:hidden bg-[#0d0f12]/95 backdrop-blur-xl px-5 py-5 space-y-3 border-t border-white/[0.06]">
            <a href="#features" className="block text-sm font-medium text-white/70 hover:text-white py-1.5" onClick={() => setMobileMenu(false)}>
              {lang === "tr" ? "Ürün" : "Product"}
            </a>
            <a href="#channels" className="block text-sm font-medium text-white/70 hover:text-white py-1.5" onClick={() => setMobileMenu(false)}>
              {lang === "tr" ? "Entegrasyonlar" : "Integrations"}
            </a>
            <a href="#pricing" className="block text-sm font-medium text-white/70 hover:text-white py-1.5" onClick={() => setMobileMenu(false)}>
              {lang === "tr" ? "Fiyatlandırma" : "Pricing"}
            </a>
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <button onClick={goLogin} className="text-sm font-medium text-white/60 py-2 text-left">{t.login}</button>
              <button onClick={goRegister} className="text-sm font-medium border border-emerald-400/30 text-emerald-400 px-5 py-2.5 rounded-full w-full">
                {t.bookDemo}
              </button>
              <button onClick={goRegister} className="text-sm font-medium border border-emerald-400/30 text-emerald-400 px-5 py-2.5 rounded-full w-full bg-emerald-400/10">
                {t.tryFree7}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative pt-12 pb-6 md:pt-20 md:pb-8 overflow-hidden">
        {/* Canvas Animation Background */}
        <FloatingCanvas />

        <div className="absolute top-20 -left-32 w-96 h-96 bg-emerald-500/[0.06] rounded-full blur-3xl" />
        <div className="absolute bottom-0 -right-32 w-96 h-96 bg-blue-500/[0.04] rounded-full blur-3xl" />

        <div className="relative max-w-[1600px] mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/[0.06] border border-emerald-400/20 mb-4 landing-reveal">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-400">{t.heroBadge}</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] mb-6 landing-reveal landing-reveal-delay-1">
              {t.heroH1a}{" "}
              <span className="landing-gradient-text">{t.heroH1b}</span>
              <br />{t.heroH1c}
            </h1>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8 landing-reveal landing-reveal-delay-3">
              <button onClick={goRegister} className="landing-btn-primary text-base px-8 py-4">
                {t.heroCta1} <ArrowRight className="w-5 h-5" />
              </button>
              <a href="#how-it-works" className="landing-btn-secondary text-base px-8 py-4">
                <Play className="w-5 h-5" /> {t.heroCta2}
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500 landing-reveal landing-reveal-delay-3">
              <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><span>{t.trust1}</span></div>
              <div className="flex items-center gap-2"><Check className="w-4 h-4" /><span>{t.trust2}</span></div>
              <div className="flex items-center gap-2"><Zap className="w-4 h-4" /><span>{t.trust3}</span></div>
            </div>
          </div>

          {/* Hero Dashboard Mockup — wider */}
          <div className="mt-10 md:mt-12 landing-reveal landing-reveal-delay-3">
            <div className="relative max-w-[1400px] mx-auto">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.06] via-emerald-500/[0.03] to-transparent rounded-3xl blur-2xl scale-105" />

              <div className="relative bg-white/[0.025] border border-white/[0.08] rounded-2xl md:rounded-3xl overflow-hidden">
                {/* Window bar */}
                <div className="flex items-center gap-2 px-5 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                    <div className="w-3 h-3 rounded-full bg-green-400/70" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white/[0.05] rounded-lg py-1.5 px-4 text-xs text-gray-600 text-center max-w-xs mx-auto">
                      app.yodijital.com
                    </div>
                  </div>
                </div>

                <div className="flex min-h-[360px] md:min-h-[480px]">
                  {/* Sidebar */}
                  <div className="hidden md:flex flex-col w-56 bg-sidebar p-3 gap-0.5">
                    <div className="flex items-center gap-2 mb-4 px-2">
                      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-bold text-white">YO.dijital</span>
                    </div>
                    {/* DASHBOARD */}
                    <div className="px-2 pt-1 pb-1"><span className="text-[9px] font-bold text-sidebar-text/50 tracking-wider">DASHBOARD</span></div>
                    <SidebarItem icon={BarChart3} label="Dashboard" />
                    {/* MESSAGING */}
                    <div className="px-2 pt-2.5 pb-1"><span className="text-[9px] font-bold text-sidebar-text/50 tracking-wider">{t.sidebarMsgSection}</span></div>
                    <SidebarItem icon={MessageCircle} label={t.sidebarInbox} active badge="12" />
                    <SidebarItem icon={Users} label={t.sidebarContacts} />
                    <SidebarItem icon={Mail} label={t.sidebarTemplates} />
                    <SidebarItem icon={Send} label={t.sidebarBulk} />
                    {/* CRM */}
                    <div className="px-2 pt-2.5 pb-1"><span className="text-[9px] font-bold text-sidebar-text/50 tracking-wider">CRM</span></div>
                    <SidebarItem icon={Workflow} label="Pipeline" />
                    <SidebarItem icon={Users} label="Leads" />
                    {/* AI */}
                    <div className="px-2 pt-2.5 pb-1"><span className="text-[9px] font-bold text-sidebar-text/50 tracking-wider">{t.sidebarAiSection}</span></div>
                    <SidebarItem icon={Bot} label={t.sidebarBot} badgeText="AI" />
                    <SidebarItem icon={Zap} label={t.sidebarAuto} />
                    <SidebarItem icon={Workflow} label={t.sidebarFlow} />
                    {/* INTEGRATIONS */}
                    <div className="px-2 pt-2.5 pb-1"><span className="text-[9px] font-bold text-sidebar-text/50 tracking-wider">{t.sidebarIntSection}</span></div>
                    <SidebarItem icon={Phone} label={t.sidebarChannels} />
                    <SidebarItem icon={Globe} label={t.sidebarIntegrations} />
                    {/* ANALYTICS */}
                    <div className="px-2 pt-2.5 pb-1"><span className="text-[9px] font-bold text-sidebar-text/50 tracking-wider">{t.sidebarAnalSection}</span></div>
                    <SidebarItem icon={BarChart3} label={t.sidebarReports} />
                  </div>

                  {/* Chat List */}
                  <div className="hidden lg:flex flex-col w-80 border-r border-white/[0.06] bg-white/[0.02]">
                    <div className="p-3 border-b border-white/[0.06]">
                      <div className="bg-white/[0.04] rounded-lg px-3 py-2 text-xs text-gray-600 border border-white/[0.06]">{t.searchPlaceholder}</div>
                    </div>
                    {t.chatList.map((chat, i) => (
                      <div key={i} className={`flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] ${i === 0 ? "bg-emerald-400/[0.06]" : "hover:bg-white/[0.03]"}`}>
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-white text-xs font-bold">{chat.name.charAt(0)}</div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#060609] flex items-center justify-center ${chat.channel === "whatsapp" ? "bg-green-500" : chat.channel === "instagram" ? "bg-pink-500" : "bg-blue-500"}`}>
                            {chat.channel === "whatsapp" && <Phone className="w-2 h-2 text-white" />}
                            {chat.channel === "instagram" && <Instagram className="w-2 h-2 text-white" />}
                            {chat.channel === "facebook" && <Facebook className="w-2 h-2 text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className={`text-xs ${chat.unread ? "font-bold text-white" : "font-medium text-gray-400"}`}>{chat.name}</span>
                            <span className="text-[10px] text-gray-600">{chat.time}</span>
                          </div>
                          <p className={`text-[11px] truncate mt-0.5 ${chat.unread ? "text-gray-300 font-medium" : "text-gray-600"}`}>{chat.msg}</p>
                        </div>
                        {chat.unread && <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-white text-xs font-bold">A</div>
                        <div>
                          <div className="text-sm font-semibold text-white">{t.chatContactName}</div>
                          <div className="text-[10px] text-green-400 flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400" /> {t.msgOnline}
                          </div>
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded-md bg-green-500/10 text-[10px] text-green-400 font-medium flex items-center gap-1">
                        <Phone className="w-3 h-3" /> WhatsApp
                      </div>
                    </div>

                    <div className="flex-1 p-5 space-y-3 overflow-hidden">
                      <div className="flex gap-2 max-w-[80%]">
                        <div className="bg-white/[0.07] rounded-2xl rounded-tl-md px-4 py-2.5">
                          <p className="text-xs text-gray-200">{t.chatMsg1}</p>
                          <span className="text-[9px] text-gray-500 mt-1 block">14:32</span>
                        </div>
                      </div>
                      <div className="flex gap-2 max-w-[80%] ml-auto flex-row-reverse">
                        <div className="bg-emerald-500 rounded-2xl rounded-tr-md px-4 py-2.5">
                          <div className="flex items-center gap-1 mb-1">
                            <Bot className="w-3 h-3 text-white/70" />
                            <span className="text-[9px] text-white/60 font-medium">{t.chatAiLabel}</span>
                          </div>
                          <p className="text-xs text-white">{t.chatMsg2}</p>
                          <span className="text-[9px] text-white/40 mt-1 block text-right">14:32 ✓✓</span>
                        </div>
                      </div>
                      <div className="flex gap-2 max-w-[80%]">
                        <div className="bg-white/[0.07] rounded-2xl rounded-tl-md px-4 py-2.5">
                          <p className="text-xs text-gray-200">{t.chatMsg3}</p>
                          <span className="text-[9px] text-gray-500 mt-1 block">14:33</span>
                        </div>
                      </div>
                      <div className="flex gap-2 max-w-[80%] ml-auto flex-row-reverse">
                        <div className="bg-emerald-500/10 rounded-2xl px-4 py-3 flex items-center gap-1">
                          <div className="landing-typing-dot" style={{ animationDelay: "0ms" }} />
                          <div className="landing-typing-dot" style={{ animationDelay: "150ms" }} />
                          <div className="landing-typing-dot" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-3 border-t border-white/[0.06]">
                      <div className="flex items-center gap-2 bg-white/[0.04] rounded-xl px-4 py-2.5">
                        <span className="text-xs text-gray-600 flex-1">{t.msgTypePlaceholder}</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
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
      <section className="py-6 border-y border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {t.statsItems.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                  <Counter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES ═══════════ */}
      <section id="features" className="py-8 md:py-10">
        <div className="max-w-[1600px] mx-auto px-6">
          <SectionHeader badge={t.featuresBadge} title={t.featuresTitle} subtitle={t.featuresSubtitle} />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
            {[
              { icon: MessageCircle, ...t.features[0] },
              { icon: Bot, ...t.features[1] },
              { icon: Users, ...t.features[2] },
              { icon: Send, ...t.features[3] },
              { icon: Workflow, ...t.features[4] },
              { icon: BarChart3, ...t.features[5] },
            ].map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section id="how-it-works" className="py-8 md:py-10">
        <div className="max-w-[1600px] mx-auto px-6">
          <SectionHeader badge={t.howBadge} title={t.howTitle} subtitle={t.howSubtitle} />

          <div className="grid md:grid-cols-3 gap-5 mt-6">
            {[
              { ...t.steps[0], icon: Phone },
              { ...t.steps[1], icon: Bot },
              { ...t.steps[2], icon: BarChart3 },
            ].map((item, i) => (
              <StepCard key={item.step} {...item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ AI SHOWCASE ═══════════ */}
      <section className="py-8 md:py-10 overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/[0.08] border border-violet-500/20 mb-5">
                <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                <span className="text-xs font-semibold text-violet-300">{t.aiBadge}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight mb-5">
                {t.aiTitleLine1} <span className="landing-gradient-text">{t.aiTitleGradient}</span> {t.aiTitleLine2}
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                {t.aiDesc}
              </p>
              <div className="space-y-3">
                {t.aiBullets.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-sm text-gray-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/[0.06] to-emerald-500/[0.06] rounded-3xl blur-3xl" />
              <div className="relative bg-white/[0.025] border border-white/[0.08] rounded-2xl p-6">
                <div className="space-y-3">
                  <ChatBubble side="left" name={t.aiCustomer} time="14:22">
                    {t.aiChat1}
                  </ChatBubble>
                  <ChatBubble side="right" name={t.aiAssistant} time="14:22" isBot>
                    {t.aiChat2}
                  </ChatBubble>
                  <ChatBubble side="left" name={t.aiCustomer} time="14:23">
                    {t.aiChat3}
                  </ChatBubble>
                  <ChatBubble side="right" name={t.aiAssistant} time="14:23" isBot>
                    {t.aiChat4}
                  </ChatBubble>
                  <div className="flex items-center gap-2 pt-2">
                    <div className="flex-1 h-px bg-white/[0.08]" />
                    <span className="text-[10px] text-gray-500 font-medium">{t.aiSaleComplete}</span>
                    <div className="flex-1 h-px bg-white/[0.08]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CHANNELS ═══════════ */}
      <section className="py-5 md:py-6 bg-white/[0.01]">
        <div className="max-w-[1600px] mx-auto px-6">
          <SectionHeader badge={t.channelsBadge} title={t.channelsTitle} subtitle={t.channelsSubtitle} />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-6">
            {[
              { ...t.channels[0], icon: Phone },
              { ...t.channels[1], icon: Instagram },
              { ...t.channels[2], icon: Facebook },
              { ...t.channels[3], icon: Globe },
            ].map((channel) => (
              <div key={channel.name} className="group relative bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 text-center hover:border-emerald-400/20 hover:bg-white/[0.04] transition-all duration-300 hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl ${channel.color} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <channel.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-sm mb-1 text-white">{channel.name}</h3>
                <p className="text-xs text-gray-500">{channel.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section id="pricing" className="py-8 md:py-10">
        <div className="max-w-[1600px] mx-auto px-6">
          <SectionHeader badge={t.pricingBadge} title={t.pricingTitle} subtitle={t.pricingSubtitle} />

          {/* Period selector */}
          <div className="flex items-center justify-center mt-5 mb-6">
            <div className="inline-flex items-center bg-white/[0.06] rounded-full p-1 gap-0.5">
              {t.periods.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActivePlan(item.key)}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                    activePlan === item.key
                      ? "bg-white/[0.1] text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Plan cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1400px] mx-auto">
            {[
              {
                ...t.plans[0],
                price: activePlan === "2yil" ? 449 : activePlan === "1yil" ? 499 : 599,
                period: t.perMonth,
                highlight: false,
              },
              {
                ...t.plans[1],
                price: activePlan === "2yil" ? 899 : activePlan === "1yil" ? 999 : 1199,
                period: t.perMonth,
                highlight: false,
              },
              {
                ...t.plans[2],
                price: activePlan === "2yil" ? 1749 : activePlan === "1yil" ? 1999 : 2499,
                period: t.perMonth,
                highlight: true,
              },
              {
                ...t.plans[3],
                price: null,
                period: "",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                  plan.highlight
                    ? "bg-emerald-500/[0.06] border-emerald-400/40 shadow-[0_8px_40px_-12px_rgba(16,185,129,0.25)] lg:scale-[1.03] landing-card-glow"
                    : "bg-white/[0.025] border-white/[0.08] hover:border-emerald-400/20 hover:bg-white/[0.04]"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-lg shadow-emerald-500/30">
                    {t.mostPopular}
                  </div>
                )}

                <h3 className="font-bold text-lg mb-1 text-white">{plan.name}</h3>
                <p className="text-xs text-gray-500 mb-4">{plan.desc}</p>

                {/* Fiyat */}
                <div className="mb-5">
                  {plan.price ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight text-white">{plan.price.toLocaleString("tr-TR")}₺</span>
                      <span className="text-sm text-gray-500">{plan.period}</span>
                    </div>
                  ) : (
                    <div className="text-2xl font-extrabold tracking-tight text-white">{t.contactUs}</div>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={plan.price ? goRegister : undefined}
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mb-6 ${
                    plan.highlight
                      ? "bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                      : "bg-emerald-400/[0.08] text-emerald-400 hover:bg-emerald-400/[0.14] border border-emerald-400/20"
                  }`}
                >
                  {plan.price ? t.tryForFree : t.contactSales}
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Özellikler */}
                <div className="space-y-2.5 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 bg-emerald-400/10">
                        <Check className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                      <span className="text-sm text-gray-400">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Karşılaştırma Tablosu */}
          <div className="mt-8 max-w-[1400px] mx-auto">
            {/* Açıklama + Toggle */}
            <div className="text-center mb-6">
              <p className="text-base text-gray-500 mb-4">
                {t.compareDesc}
              </p>
              <button
                onClick={() => setCompareOpen(!compareOpen)}
                className="inline-flex items-center gap-2 text-emerald-400 font-bold text-sm hover:text-emerald-300 transition-colors group"
              >
                {t.compareToggle}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5 group-hover:scale-110 transition-transform">
                  <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Karşılaştırma Tablosu — toggle ile açılır */}
            {compareOpen && <div className="overflow-x-auto animate-slide-up">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-white/[0.06]">
                    <th className="text-left py-3 px-4 font-semibold text-gray-500 w-[260px]">{t.compareFeature}</th>
                    <th className="text-center py-3 px-3 font-bold text-white">{t.plans[0].name}</th>
                    <th className="text-center py-3 px-3 font-bold text-white">{t.plans[1].name}</th>
                    <th className="text-center py-3 px-3 font-bold text-emerald-400">{t.plans[2].name}</th>
                    <th className="text-center py-3 px-3 font-bold text-white">{t.plans[3].name}</th>
                  </tr>
                </thead>
                <tbody>
                  {t.compareTable.map((row, i) => {
                    if ("section" in row) {
                      return (
                        <tr key={`s-${i}`} className="bg-white/[0.02]">
                          <td colSpan={5} className="py-2.5 px-4 font-bold text-xs text-gray-500 uppercase tracking-wider">{row.section}</td>
                        </tr>
                      )
                    }
                    return (
                      <tr key={`r-${i}`} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4 text-gray-400">{row.label}</td>
                        {row.vals.map((val, j) => (
                          <td key={j} className={`py-2.5 px-3 text-center ${j === 2 ? "bg-emerald-400/[0.04]" : ""}`}>
                            {val === true ? (
                              <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                            ) : val === false ? (
                              <span className="text-gray-700">—</span>
                            ) : (
                              <span className={`text-xs font-semibold ${j === 2 ? "text-emerald-400" : "text-gray-400"}`}>{val}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>}
          </div>

          {/* Bottom CTA */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 mb-3">{t.pricingCtaText}</p>
            <button onClick={goRegister} className="landing-btn-primary text-base px-8 py-3.5">
              {t.pricingCtaBtn} <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section id="testimonials" className="py-8 md:py-10">
        <div className="max-w-[1600px] mx-auto px-6">
          <SectionHeader badge={t.testimonialsBadge} title={t.testimonialsTitle} subtitle={t.testimonialsSubtitle} />

          <div className="grid md:grid-cols-3 gap-5 mt-6">
            {t.testimonials.map((item) => (
              <TestimonialCard key={item.name} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="py-12 md:py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#060609]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(20,184,166,0.05),transparent_60%)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-3xl" style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-5">
            {t.ctaTitle1}<br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">{t.ctaTitle2}</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            {t.ctaDesc}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={goRegister} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-8 py-4 rounded-xl text-base flex items-center gap-2 hover:from-emerald-400 hover:to-teal-400 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              {t.ctaBtn1} <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={goLogin} className="text-gray-500 hover:text-white font-medium px-8 py-4 text-base transition-colors">
              {t.ctaBtn2}
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="w-full border-t border-white/[0.05] py-6 px-6 bg-[#060609]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          {/* Copyright */}
          <div className="flex items-center gap-3 text-gray-500">
            <img src="/logo-yo.png" alt="YO Dijital" className="h-5 w-auto object-contain brightness-0 invert opacity-40" />
            <span>{t.copyright}</span>
          </div>

          {/* Legal links + lang switcher */}
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <nav className="flex flex-wrap justify-center sm:justify-end gap-x-5 gap-y-2 text-gray-500">
              {legalLinks.map((l) => (
                <a key={l.href} href={l.href} className="hover:text-gray-300 transition-colors">{l.label}</a>
              ))}
            </nav>

            {/* Language dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropOpen((v) => !v)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04] border border-white/[0.08]"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20"/>
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
                <span>{langMeta[lang].label}</span>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`opacity-60 transition-transform duration-200 ${dropOpen ? "rotate-180" : ""}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {dropOpen && (
                <div className="absolute bottom-full mb-2 right-0 w-36 bg-[#111115] border border-white/[0.08] rounded-xl overflow-hidden shadow-xl z-50">
                  {(["tr", "en"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLang(l); setDropOpen(false) }}
                      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                        lang === l
                          ? "text-white bg-white/[0.06]"
                          : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-base leading-none">{langMeta[l].flag}</span>
                      <span>{langMeta[l].label}</span>
                      {lang === l && (
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-emerald-400">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
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

function SidebarItem({ icon: Icon, label, active, badge, badgeText }: { icon: any; label: string; active?: boolean; badge?: string; badgeText?: string }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] ${active ? "bg-sidebar-active text-white font-medium" : "text-sidebar-text"}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="flex-1 truncate">{label}</span>
      {badge && <span className="bg-primary text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">{badge}</span>}
      {badgeText && <span className="bg-violet-500/20 text-violet-300 text-[8px] px-1 py-0.5 rounded font-bold">{badgeText}</span>}
    </div>
  )
}

function SectionHeader({ badge, title, subtitle }: { badge: string; title: string; subtitle: string }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={`text-center max-w-3xl mx-auto transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/[0.06] border border-emerald-400/20 mb-3">
        <span className="text-sm font-semibold text-emerald-400">{badge}</span>
      </div>
      <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight mb-3 text-white">{title}</h2>
      <p className="text-base text-gray-400 leading-relaxed">{subtitle}</p>
    </div>
  )
}

function FeatureCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={`group relative bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 hover:border-emerald-400/20 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(16,185,129,0.06)] transition-all duration-500 hover:-translate-y-1 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-bold text-lg mb-2 text-white">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
    </div>
  )
}

function StepCard({ step, title, desc, icon: Icon, index }: { step: string; title: string; desc: string; icon: any; index: number }) {
  const { ref, inView } = useInView()
  return (
    <div ref={ref} className={`relative text-center transition-all duration-700 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: `${index * 150}ms` }}>
      {index < 2 && <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px bg-gradient-to-r from-emerald-400/20 to-emerald-400/5" />}
      <div className="relative inline-flex mb-5">
        <div className="w-24 h-24 rounded-3xl bg-emerald-400/[0.06] border border-emerald-400/15 flex items-center justify-center">
          <Icon className="w-10 h-10 text-emerald-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-emerald-500/30">
          {step.replace("0", "")}
        </div>
      </div>
      <h3 className="font-bold text-lg mb-2 text-white">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed max-w-xs mx-auto">{desc}</p>
    </div>
  )
}

function ChatBubble({ side, name, time, children, isBot }: { side: "left" | "right"; name: string; time: string; children: React.ReactNode; isBot?: boolean }) {
  return (
    <div className={`flex gap-2 ${side === "right" ? "ml-auto flex-row-reverse max-w-[85%]" : "max-w-[85%]"}`}>
      <div className={`rounded-2xl px-4 py-3 ${side === "right" ? "bg-emerald-500 text-white rounded-tr-md" : "bg-white/[0.07] text-gray-200 rounded-tl-md"}`}>
        {isBot && (
          <div className="flex items-center gap-1 mb-1">
            <Bot className="w-3 h-3 text-white/60" />
            <span className="text-[10px] text-white/50 font-medium">{name}</span>
          </div>
        )}
        <p className="text-sm leading-relaxed">{children}</p>
        <span className={`text-[10px] mt-1 block ${side === "right" ? "text-white/40 text-right" : "text-gray-500"}`}>{time}</span>
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
    <div ref={ref} className={`bg-white/[0.025] border border-white/[0.06] rounded-2xl p-7 hover:border-emerald-400/15 hover:bg-white/[0.04] transition-all duration-700 hover:-translate-y-1 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
      <div className="flex gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
      </div>
      <p className="text-sm text-gray-300 leading-relaxed mb-5 italic">&ldquo;{quote}&rdquo;</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center text-white font-bold text-sm">{name.charAt(0)}</div>
        <div>
          <div className="font-bold text-sm text-white">{name}</div>
          <div className="text-xs text-gray-500">{role}, {company}</div>
        </div>
      </div>
    </div>
  )
}
