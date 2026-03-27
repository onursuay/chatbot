"use client"

import { useParams } from "next/navigation"
import Image from "next/image"
import { useI18n } from "@/lib/i18n"

export default function CookiePolicyPage() {
  const { lang: urlLang } = useParams()
  const { lang } = useI18n()

  const isTR = lang === "tr"

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-dark-500 text-xs mb-2">{isTR ? "Son guncelleme: 28 Mart 2026" : "Last updated: March 28, 2026"}</p>
        <h1 className="text-3xl font-bold text-white mb-2">{isTR ? "Cerez Politikasi" : "Cookie Policy"}</h1>
        <p className="text-dark-400 text-sm mb-8">YO Dijital Medya · chatbot.yodijital.com</p>

        <div className="text-dark-300 text-sm space-y-6 leading-relaxed">

          <h2 className="text-xl font-semibold text-white">{isTR ? "1. Cerezler Nedir?" : "1. What Are Cookies?"}</h2>
          <p>{isTR
            ? "Cerezler, web sitemizi ziyaret ettiginizde tarayiciniza yerlestirilen kucuk metin dosyalaridir. Tercihlerinizi hatirlamak, oturumunuzu yonetmek ve kullanim istatistikleri toplamak icin kullanilir."
            : "Cookies are small text files placed on your browser by websites. They are used to remember your preferences, manage your session, and collect usage statistics."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "2. Kullandigimiz Cerez Turleri" : "2. Types of Cookies We Use"}</h2>

          <div className="bg-dark-900 border border-dark-800 rounded-lg p-4 space-y-4">
            <div>
              <p className="font-medium text-white">{isTR ? "Zorunlu Cerezler" : "Essential Cookies"}</p>
              <p className="text-dark-400 text-xs mt-1">{isTR
                ? "Oturum yonetimi (JWT token), kullanici kimlik dogrulama ve guvenlik kontrolleri icin gereklidir. Platform calismasi bunlara baglidir."
                : "Required for session management (JWT token), user authentication, and security checks. Platform operation depends on these."}</p>
            </div>
            <div>
              <p className="font-medium text-white">{isTR ? "Islevsel Cerezler" : "Functional Cookies"}</p>
              <p className="text-dark-400 text-xs mt-1">{isTR
                ? "Dil tercihi (TR/EN), secili dashboard ayarlari ve kullanici tercihlerini saklar."
                : "Preserve language selection (TR/EN), dashboard settings, and user preferences."}</p>
            </div>
            <div>
              <p className="font-medium text-white">{isTR ? "Ucuncu Taraf Cerezleri" : "Third-Party Cookies"}</p>
              <p className="text-dark-400 text-xs mt-1">{isTR
                ? "Facebook SDK, WhatsApp Embedded Signup ve Instagram baglantisi sirasinda kendi cerezlerini kullanabilir. Bu cerezler Meta'nin gizlilik politikasina tabidir."
                : "Facebook SDK may use its own cookies during WhatsApp Embedded Signup and Instagram connection. These cookies are subject to Meta's privacy policy."}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "3. Cerez Saklama Sureleri" : "3. Cookie Retention Periods"}</h2>
          <ul className="list-disc list-inside text-dark-400 space-y-1 ml-2">
            <li>{isTR ? "Oturum cerezleri: Tarayici kapatildiginda silinir" : "Session cookies: Removed upon browser closure"}</li>
            <li>{isTR ? "Kalici cerezler: 30 gune kadar saklanir (oturum kimigi, dil tercihi)" : "Persistent cookies: Maintained up to 30 days (session ID, language preference)"}</li>
            <li>{isTR ? "Ucuncu taraf cerezleri: Platform politikasina gore degisir" : "Third-party cookies: Duration varies per platform policy"}</li>
          </ul>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "4. Cerez Yonetimi" : "4. Cookie Management"}</h2>
          <p>{isTR
            ? "Cerezleri tarayici ayarlarindan silebilir veya engelleyebilirsiniz. Ancak zorunlu cerezleri devre disi birakmak platform islevselligini bozabilir."
            : "You may delete or block cookies through browser settings. However, disabling essential cookies may impair platform functionality."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "5. Cloudflare Guvenlik Cerezleri" : "5. Cloudflare Security Cookies"}</h2>
          <p>{isTR
            ? "Platformumuz Vercel altyapisini kullanir. Vercel ve Cloudflare, bot koruma ve guvenlik dogrulamasi icin kendi cerezlerini (cf_clearance, __cf_bm vb.) ayarlayabilir."
            : "Our platform uses Vercel infrastructure. Vercel and Cloudflare may set their own cookies (cf_clearance, __cf_bm, etc.) for bot protection and security verification."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "6. Yasal Dayanak" : "6. Legal Basis"}</h2>
          <p>{isTR
            ? "Cerez kullanimi 6698 sayili KVKK ve AB GDPR ile uyumludur. Zorunlu cerezler mesru menfaat kapsaminda calisir; digerleri acik kullanici onayini gerektirir."
            : "Cookie usage complies with Turkish KVKK No. 6698 and EU GDPR. Essential cookies operate under legitimate interest; others require explicit user consent."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "7. Iletisim" : "7. Contact"}</h2>
          <p><a href="mailto:info@yodijital.com" className="text-brand-400 hover:underline">info@yodijital.com</a></p>
        </div>

        <div className="mt-12 pt-6 border-t border-dark-800 flex items-center gap-3">
          <Image src="/logo.png" alt="YO Dijital" width={20} height={20} />
          <span className="text-dark-600 text-xs">© 2025 YoChat. All rights reserved.</span>
        </div>
      </div>
    </div>
  )
}
