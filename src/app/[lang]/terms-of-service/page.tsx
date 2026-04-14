"use client"

import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold text-white mb-1">{isTR ? "Kullanım Koşulları" : "Terms of Service"}</h1>
          <p className="text-sm text-gray-600 mb-10">YoChat · chatbot.yodijital.com</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "1. Taraflar ve Tanımlar" : "1. Parties and Definitions"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Bu koşullar, YO Dijital Medya tarafından işletilen YoChat platformuna erişen kullanıcıları kapsar. YoChat, işletmelerin WhatsApp, Instagram ve Facebook üzerinden müşteri iletişimini yönettiği bir SaaS platformudur."
                  : "These terms govern users accessing the YoChat platform operated by YO Dijital Medya. YoChat is a SaaS platform where businesses manage customer communication across WhatsApp, Instagram, and Facebook."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "2. Hizmet Tanımı" : "2. Scope of Service"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "YoChat, işletmelere WhatsApp Business API, Instagram DM ve Facebook Messenger üzerinden müşteri mesajlarını tek panelden yönetme, AI chatbot ile otomatik yanıtlama, toplu mesaj gönderimi, satış pipeline yönetimi ve otomasyon oluşturma imkânı sağlar."
                  : "YoChat enables businesses to manage customer messages from WhatsApp Business API, Instagram DM, and Facebook Messenger in one panel, auto-reply with AI chatbot, send bulk messages, manage sales pipelines, and create automations."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "3. Kullanıcı Yetki ve Sorumlulukları" : "3. User Authority and Responsibilities"}</h2>
              <ul className="list-disc list-inside text-[14px] text-[#8a8f98] space-y-1 ml-2">
                <li>{isTR ? "Yalnızca yetkilendirildiğiniz hesapları bağlayabilirsiniz" : "You may only connect accounts you are authorized to use"}</li>
                <li>{isTR ? "Platformu yasal amaçlarla kullanmayı kabul edersiniz" : "You agree to use the platform for lawful purposes"}</li>
                <li>{isTR ? "Spam gönderimi, yanıltıcı içerik ve Meta politikalarını ihlal eden kullanım yasaktır" : "Spam, misleading content, and violations of Meta policies are prohibited"}</li>
                <li>{isTR ? "Yetkisiz üçüncü taraf hesap erişimi sağlanamaz" : "Unauthorized third-party account access is prohibited"}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "4. Platform ve API Uyumluluğu" : "4. Platform and API Compliance"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "YoChat üzerinden yapılan işlemler, bağlı platformların (Meta, Google) koşul ve politikalarıyla uyumlu olmalıdır. Yetkisiz veri toplama, kötüye kullanım veya yanıltıcı içerik yasaklanmıştır."
                  : "Operations through YoChat must comply with connected platforms' (Meta, Google) terms and policies. Unauthorized data collection, misuse, or misleading content is prohibited."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "5. Sorumluluk Sınırı" : "5. Limitation of Liability"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Gösterilen veriler bağlı platformlardan alınır; gecikme, kota, kesinti veya platform değişiklikleri nedeniyle tutarsızlıklar oluşabilir. YoChat, üçüncü taraf platform sorunlarından veya API kısıtlamalarından kaynaklanan zararlardan sınırlı ölçüde sorumludur."
                  : "Data displayed derives from connected platforms; discrepancies may occur due to delay, quotas, outages, or platform changes. YoChat's liability is limited regarding damage from third-party platform issues or API constraints."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "6. Hesap Güvenliği" : "6. Account Security"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Kullanıcılar hesap güvenliği ve erişim bilgilerinin korunmasından sorumludur. Yetkisiz erişim durumunda derhal bildirim yapılmalıdır."
                  : "Users are responsible for account security and access credential protection. Any unauthorized access must be reported immediately."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "7. Fesih" : "7. Termination"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "YoChat, kötüye kullanım veya koşulların ihlali durumunda hesap erişimini askıya alma veya sonlandırma hakkını saklı tutar."
                  : "YoChat reserves the right to suspend or terminate account access following misuse or violation of terms."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "8. Değişiklikler" : "8. Changes"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Bu koşullar periyodik olarak güncellenebilir. Güncel sürüm her zaman bu sayfada yayınlanır."
                  : "These terms may be updated periodically. The current version is always published on this page."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "9. İletişim" : "9. Contact"}</h2>
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
