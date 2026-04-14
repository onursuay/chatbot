/**
 * Baileys Service — WhatsApp Kişisel Hesap Bağlantısı
 *
 * Railway'e deploy için:
 *   1. Railway > New Service > GitHub Repo
 *   2. Root Directory: baileys-service
 *   3. Env vars ekle (aşağıya bak)
 *   4. Deploy et → /qr adresini aç → QR'ı tara
 *
 * Env vars:
 *   NEXTJS_WEBHOOK_URL  = https://your-app.vercel.app/api/webhook/baileys
 *   BAILEYS_WEBHOOK_SECRET = gizli_anahtar (istediğin bir string)
 *   ORG_ID              = Supabase'deki org uuid'in
 *   PORT                = 3001 (Railway otomatik atar)
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys"
import qrcode from "qrcode-terminal"
import QRCode from "qrcode"
import express from "express"
import { createRequire } from "module"

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
// Global state
// ============================================
let sock = null
let currentQR = null   // tarayıcıda göstermek için
let isConnected = false
let connectedNumber = null

// ============================================
// WhatsApp bağlantısını başlat
// ============================================
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  console.log(`[Baileys] v${version.join(".")} başlatılıyor...`)

  sock = makeWASocket.default({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ["Ceylin Chatbot", "Chrome", "1.0.0"],
  })

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      currentQR = qr
      isConnected = false
      // Terminal için de göster (Railway logs)
      console.log("\n[Baileys] QR Kod — Telefonda WhatsApp > Bağlı Cihazlar > Cihaz Ekle:")
      qrcode.generate(qr, { small: true })
      console.log(`\n[Baileys] Tarayıcıda görüntülemek için: http://localhost:${PORT}/qr\n`)
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut
      isConnected = false
      connectedNumber = null
      currentQR = null

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
      isConnected = true
      currentQR = null
      connectedNumber = sock.user?.id?.split(":")[0] || null
      console.log(`[Baileys] ✓ WhatsApp bağlantısı kuruldu! Numara: ${connectedNumber}`)
    }
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return

    for (const msg of messages) {
      if (msg.key.fromMe) continue

      const remoteJid = msg.key.remoteJid
      if (!remoteJid || remoteJid.endsWith("@g.us")) continue

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        null

      if (!text) continue

      const messageId = msg.key.id
      const senderName = msg.pushName || remoteJid.split("@")[0]
      const timestamp = msg.messageTimestamp
        ? Number(msg.messageTimestamp)
        : Math.floor(Date.now() / 1000)

      console.log(`[Baileys] Gelen: ${remoteJid.split("@")[0]} | "${text.slice(0, 60)}"`)

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
      console.error("[Baileys] Webhook hatası:", res.status, await res.text())
    } else {
      console.log(`[Baileys] ✓ Webhook → ${payload.from?.split("@")[0]}`)
    }
  } catch (err) {
    console.error("[Baileys] Webhook bağlantı hatası:", err.message)
  }
}

// ============================================
// Express HTTP Sunucusu
// ============================================
const app = express()
app.use(express.json())

function verifySecret(req, res, next) {
  const incomingSecret = req.headers["x-baileys-secret"]
  if (incomingSecret !== BAILEYS_WEBHOOK_SECRET) {
    console.warn("[Baileys] /send — Geçersiz secret")
    return res.status(403).json({ error: "Forbidden" })
  }
  next()
}

// Health check — Ceylin paneli bu endpoint'i kontrol eder
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    connected: isConnected,
    number: connectedNumber,
  })
})

// QR kod sayfası — tarayıcıda aç, telefonla tara
app.get("/qr", async (req, res) => {
  if (isConnected) {
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>WhatsApp Bağlı</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4;}
      .box{text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);}
      h2{color:#16a34a;margin-bottom:8px;}p{color:#6b7280;}</style>
    </head><body><div class="box">
      <h2>✓ WhatsApp Bağlı</h2>
      <p>Numara: +${connectedNumber}</p>
      <p style="margin-top:16px;font-size:13px;color:#9ca3af;">Bu servis WhatsApp mesajlarını Ceylin'e iletiyor.</p>
    </div></body></html>`)
  }

  if (!currentQR) {
    return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>QR Bekleniyor</title>
      <meta http-equiv="refresh" content="3">
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa;}
      .box{text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);}
      h2{color:#374151;}p{color:#6b7280;}</style>
    </head><body><div class="box">
      <h2>QR Oluşturuluyor...</h2>
      <p>Sayfa 3 saniyede otomatik yenileniyor.</p>
    </div></body></html>`)
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(currentQR, { width: 300, margin: 2 })
    res.send(`<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>WhatsApp QR</title>
      <meta http-equiv="refresh" content="30">
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fafafa;}
      .box{text-align:center;padding:40px;background:white;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);}
      h2{color:#374151;margin-bottom:4px;}p{color:#6b7280;font-size:14px;}
      img{border:1px solid #e5e7eb;border-radius:8px;margin:20px 0;display:block;}
      .hint{font-size:12px;color:#9ca3af;margin-top:8px;}</style>
    </head><body><div class="box">
      <h2>WhatsApp QR Kodu</h2>
      <p>Telefonda: <strong>WhatsApp → Bağlı Cihazlar → Cihaz Ekle</strong></p>
      <img src="${qrDataUrl}" width="300" height="300" />
      <p>Bağlandıktan sonra bu sayfa otomatik güncellenir.</p>
      <p class="hint">QR 30 saniyede bir yenilenir.</p>
    </div></body></html>`)
  } catch (err) {
    res.status(500).send("QR oluşturma hatası: " + err.message)
  }
})

// Mesaj gönder — Next.js bu endpoint'i çağırır
app.post("/send", verifySecret, async (req, res) => {
  const { to, text } = req.body

  if (!to || !text) {
    return res.status(400).json({ error: "to ve text gerekli" })
  }

  if (!sock?.user) {
    return res.status(503).json({ error: "WhatsApp bağlantısı yok" })
  }

  try {
    const jid = to.includes("@") ? to : `${to}@s.whatsapp.net`
    await sock.sendMessage(jid, { text })
    console.log(`[Baileys] /send ✓ → ${jid.split("@")[0]}`)
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
  console.log(`[Baileys] QR sayfası: http://localhost:${PORT}/qr`)
  console.log(`[Baileys] Next.js webhook: ${NEXTJS_WEBHOOK_URL}`)
})

startWhatsApp().catch((err) => {
  console.error("[Baileys] Başlatma hatası:", err)
  process.exit(1)
})
