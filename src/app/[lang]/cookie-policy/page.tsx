"use client"

import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

export default function CookiePolicyPage() {
  const { lang: urlLang } = useParams()
  const isTR = urlLang !== "en"
  const prefix = `/${urlLang}`

  return (
    <div className="min-h-screen bg-[#060609] text-white" style={{ fontSize: "16px" }}>
      {/* Header */}
      <header className="w-full border-b border-white/[0.05] py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href={prefix}>
            <Image src="/logo-yo.png" alt="YO Dijital" width={80} height={28} className="brightness-0 invert opacity-80" />
          </Link>
          <Link href={prefix} className="text-sm text-gray-500 hover:text-emerald-400 transition-colors">
            {isTR ? "← Ana Sayfa" : "← Home"}
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <Link href={prefix} className="text-emerald-400 hover:text-emerald-300 transition-colors mb-8 inline-block text-sm">
          &larr; {isTR ? "Ana sayfaya dön" : "Back to homepage"}
        </Link>

        <div className="relative rounded-2xl border border-emerald-400/10 bg-white/[0.02] px-8 py-10 shadow-[0_0_60px_rgba(16,185,129,0.07),inset_0_0_40px_rgba(16,185,129,0.03)]">
          <p className="text-xs text-gray-600 mb-1">{isTR ? "Son güncelleme: 28 Mart 2026" : "Last updated: March 28, 2026"}</p>
          <h1 className="text-3xl font-bold text-white mb-1">{isTR ? "Çerez Politikası" : "Cookie Policy"}</h1>
          <p className="text-sm text-gray-600 mb-10">YoChat · chatbot.yodijital.com</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "1. Çerezler Nedir?" : "1. What Are Cookies?"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Çerezler, web sitemizi ziyaret ettiğinizde tarayıcınıza yerleştirilen küçük metin dosyalarıdır. Tercihlerinizi hatırlamak, oturumunuzu yönetmek ve kullanım istatistikleri toplamak için kullanılır."
                  : "Cookies are small text files placed on your browser when you visit our website. They are used to remember your preferences, manage your session, and collect usage statistics."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "2. Kullandığımız Çerez Türleri" : "2. Types of Cookies We Use"}</h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-sm font-semibold text-gray-300 mb-2">{isTR ? "Zorunlu Çerezler" : "Essential Cookies"}</p>
                  <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                    {isTR
                      ? "Oturum yönetimi (JWT token), kullanıcı kimlik doğrulama ve güvenlik kontrolleri için gereklidir. Platform çalışması bunlara bağlıdır."
                      : "Required for session management (JWT token), user authentication, and security checks. Platform operation depends on these."}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-sm font-semibold text-gray-300 mb-2">{isTR ? "İşlevsel Çerezler" : "Functional Cookies"}</p>
                  <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                    {isTR
                      ? "Dil tercihi (TR/EN), seçili dashboard ayarları ve kullanıcı tercihlerini saklar."
                      : "Preserve language selection (TR/EN), dashboard settings, and user preferences."}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-sm font-semibold text-gray-300 mb-2">{isTR ? "Üçüncü Taraf Çerezleri" : "Third-Party Cookies"}</p>
                  <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                    {isTR
                      ? "Facebook SDK, WhatsApp Embedded Signup ve Instagram bağlantısı sırasında kendi çerezlerini kullanabilir. Bu çerezler Meta'nın gizlilik politikasına tabidir."
                      : "Facebook SDK may use its own cookies during WhatsApp Embedded Signup and Instagram connection. These cookies are subject to Meta's privacy policy."}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "3. Çerez Saklama Süreleri" : "3. Cookie Retention Periods"}</h2>
              <ul className="list-disc list-inside text-[14px] text-[#8a8f98] space-y-1 ml-2">
                <li>{isTR ? "Oturum çerezleri: Tarayıcı kapatıldığında silinir" : "Session cookies: Removed upon browser closure"}</li>
                <li>{isTR ? "Kalıcı çerezler: 30 güne kadar saklanır (oturum kimliği, dil tercihi)" : "Persistent cookies: Maintained up to 30 days (session ID, language preference)"}</li>
                <li>{isTR ? "Üçüncü taraf çerezleri: Platform politikasına göre değişir" : "Third-party cookies: Duration varies per platform policy"}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "4. Çerez Yönetimi" : "4. Cookie Management"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Çerezleri tarayıcı ayarlarınızdan silebilir veya engelleyebilirsiniz. Ancak zorunlu çerezleri devre dışı bırakmak platform işlevselliğini bozabilir."
                  : "You may delete or block cookies through browser settings. However, disabling essential cookies may impair platform functionality."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "5. Cloudflare Güvenlik Çerezleri" : "5. Cloudflare Security Cookies"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Platformumuz Vercel altyapısını kullanır. Vercel ve Cloudflare, bot koruma ve güvenlik doğrulaması için kendi çerezlerini (cf_clearance, __cf_bm vb.) ayarlayabilir."
                  : "Our platform uses Vercel infrastructure. Vercel and Cloudflare may set their own cookies (cf_clearance, __cf_bm, etc.) for bot protection and security verification."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "6. Yasal Dayanak" : "6. Legal Basis"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Çerez kullanımı 6698 sayılı KVKK ve AB GDPR ile uyumludur. Zorunlu çerezler meşru menfaat kapsamında çalışır; diğerleri açık kullanıcı onayını gerektirir."
                  : "Cookie usage complies with Turkish KVKK No. 6698 and EU GDPR. Essential cookies operate under legitimate interest; others require explicit user consent."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "7. İletişim" : "7. Contact"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR ? "E-posta:" : "Email:"}{" "}
                <a href="mailto:info@yodijital.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">info@yodijital.com</a>
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full border-t border-white/[0.05] py-6 px-6 bg-[#060609]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3 text-gray-500">
            <Image src="/logo-yo.png" alt="YO Dijital" width={48} height={18} className="object-contain brightness-0 invert opacity-40" />
            <span>© 2025 YO Dijital. {isTR ? "Tüm hakları saklıdır." : "All rights reserved."}</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-5 text-gray-500">
            <a href={`${prefix}/privacy-policy`} className="hover:text-gray-300 transition-colors">{isTR ? "Gizlilik Politikası" : "Privacy Policy"}</a>
            <a href={`${prefix}/cookie-policy`} className="hover:text-gray-300 transition-colors">{isTR ? "Çerez Politikası" : "Cookie Policy"}</a>
            <a href={`${prefix}/terms-of-service`} className="hover:text-gray-300 transition-colors">{isTR ? "Kullanım Koşulları" : "Terms of Service"}</a>
            <a href={`${prefix}/data-deletion`} className="hover:text-gray-300 transition-colors">{isTR ? "Veri Silme" : "Data Deletion"}</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
