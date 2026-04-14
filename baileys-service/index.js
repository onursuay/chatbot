/**
 * Baileys Service — WhatsApp Kişisel Hesap Bağlantısı
 *
 * Kurulum:
 *   cd baileys-service && npm install
 *
 * Çalıştırma:
 *   NEXTJS_WEBHOOK_URL=https://your-app.vercel.app/api/webhook/baileys \
 *   BAILEYS_WEBHOOK_SECRET=gizli_anahtar_buraya \
 *   ORG_ID=your-org-uuid \
 *   node index.js
 *
 * İlk çalıştırmada QR kodu terminalde görünür.
 * Telefonda WhatsApp > Bağlı Cihazlar > QR okut.
 * Oturum auth_info/ klasörüne kaydedilir, bir daha QR gerekmez.
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys"
import qrcode from "qrcode-terminal"
import express from "express"
import { createRequire } from "module"

// pino logger — Baileys'in verbose loglarını kapat
const require = createRequire(import.meta.url)
const pino = require("pino")
const logger = pino({ level: "silent" })

// ============================================
// Ortam değişkenleri
// ============================================
const NEXTJS_WEBHOOK_URL = process.env.NEXTJS_WEBHOOK_URL
const BAILEYS_WEBHOOK_SECRET = process.env.BAILEYS_WEBHOOK_SECRET
const ORG_ID = process.env.ORG_ID
const PORT = parseInt(process.env.PORT || "3001", 10)
const AUTH_DIR = process.env.AUTH_DIR || "./auth_info"

if (!NEXTJS_WEBHOOK_URL || !BAILEYS_WEBHOOK_SECRET || !ORG_ID) {
  console.error("HATA: NEXTJS_WEBHOOK_URL, BAILEYS_WEBHOOK_SECRET ve ORG_ID env değişkenleri gerekli!")
  process.exit(1)
}

// ============================================
// Global WhatsApp socket referansı
// ============================================
let sock = null

// ============================================
// WhatsApp bağlantısını başlat
// ============================================
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  console.log(`[Baileys] Baileys v${version.join(".")} başlatılıyor...`)

  sock = makeWASocket.default({
    version,
    auth: state,
    logger,
    printQRInTerminal: false, // Kendimiz handle ediyoruz
    browser: ["Ceylin Chatbot", "Chrome", "1.0.0"],
  })

  // ---- Bağlantı olayları ----
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log("\n[Baileys] QR Kod — Telefonda WhatsApp > Bağlı Cihazlar > Cihaz Ekle:")
      qrcode.generate(qr, { small: true })
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut

      console.log(`[Baileys] Bağlantı kapandı. Kod: ${statusCode} | Yeniden bağlan: ${shouldReconnect}`)

      if (shouldReconnect) {
        console.log("[Baileys] 5 saniye sonra yeniden bağlanılıyor...")
        setTimeout(startWhatsApp, 5000)
      } else {
        console.log("[Baileys] Oturum kapatıldı. auth_info/ klasörünü sil ve yeniden başlat.")
        process.exit(1)
      }
    }

    if (connection === "open") {
      console.log("[Baileys] ✓ WhatsApp bağlantısı kuruldu!")
      console.log("[Baileys] Numarası:", sock.user?.id?.split(":")[0])
    }
  })

  // ---- Oturum bilgilerini kaydet ----
  sock.ev.on("creds.update", saveCreds)

  // ---- Gelen mesajları işle ----
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return

    for (const msg of messages) {
      // Kendi gönderdiğimiz mesajları atlıyoruz
      if (msg.key.fromMe) continue

      // Sadece bireysel sohbetler (grup mesajları atla)
      const remoteJid = msg.key.remoteJid
      if (!remoteJid || remoteJid.endsWith("@g.us")) continue

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        null

      if (!text) continue // Fotoğraf, sticker vs. atla

      const messageId = msg.key.id
      const senderName = msg.pushName || remoteJid.split("@")[0]
      const timestamp = msg.messageTimestamp
        ? Number(msg.messageTimestamp)
        : Math.floor(Date.now() / 1000)

      console.log(`[Baileys] Gelen: ${remoteJid} | "${text.slice(0, 60)}"`)

      // Next.js webhook'una ilet
      await forwardToNextjs({
        org_id: ORG_ID,
        from: remoteJid,
        message_id: messageId,
        text,
        sender_name: senderName,
        timestamp,
      })
    }
  })
}

// ============================================
// Mesajı Next.js webhook'una ilet
// ============================================
async function forwardToNextjs(payload) {
  try {
    const res = await fetch(NEXTJS_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-baileys-secret": BAILEYS_WEBHOOK_SECRET,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      console.error("[Baileys] Webhook iletim hatası:", res.status, await res.text())
    } else {
      console.log("[Baileys] ✓ Webhook iletildi:", payload.from?.split("@")[0])
    }
  } catch (err) {
    console.error("[Baileys] Webhook bağlantı hatası:", err.message)
  }
}

// ============================================
// Express HTTP Sunucusu
// Next.js bu sunucuyu mesaj göndermek için çağırır
// POST /send — { to: "905301234567@s.whatsapp.net", text: "..." }
// ============================================
const app = express()
app.use(express.json())

// Güvenlik: shared secret doğrulama
function verifySecret(req, res, next) {
  const incomingSecret = req.headers["x-baileys-secret"]
  if (incomingSecret !== BAILEYS_WEBHOOK_SECRET) {
    console.warn("[Baileys] /send — Geçersiz secret")
    return res.status(403).json({ error: "Forbidden" })
  }
  next()
}

// Health check
app.get("/", (req, res) => {
  const connected = sock?.user != null
  res.json({
    status: "ok",
    connected,
    number: connected ? sock.user?.id?.split(":")[0] : null,
  })
})

// Mesaj gönder
app.post("/send", verifySecret, async (req, res) => {
  const { to, text } = req.body

  if (!to || !text) {
    return res.status(400).json({ error: "to ve text gerekli" })
  }

  if (!sock?.user) {
    return res.status(503).json({ error: "WhatsApp bağlantısı yok" })
  }

  try {
    // to formatı: 905301234567@s.whatsapp.net
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`
    await sock.sendMessage(jid, { text })
    console.log(`[Baileys] /send ✓ → ${jid} | "${text.slice(0, 40)}"`)
    res.json({ success: true })
  } catch (err) {
    console.error("[Baileys] /send hatası:", err)
    res.status(500).json({ error: err.message })
  }
})

// ============================================
// Başlat
// ============================================
app.listen(PORT, () => {
  console.log(`[Baileys] HTTP sunucusu port ${PORT}'de çalışıyor`)
  console.log(`[Baileys] Next.js webhook: ${NEXTJS_WEBHOOK_URL}`)
  console.log(`[Baileys] Org ID: ${ORG_ID}`)
})

startWhatsApp().catch((err) => {
  console.error("[Baileys] Başlatma hatası:", err)
  process.exit(1)
})
