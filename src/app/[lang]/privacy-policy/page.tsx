"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

export default function PrivacyPolicyPage() {
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
          <h1 className="text-3xl font-bold text-white mb-1">{isTR ? "Gizlilik Politikası" : "Privacy Policy"}</h1>
          <p className="text-sm text-gray-600 mb-10">YoChat · chatbot.yodijital.com</p>

          <div className="space-y-8">
            <section>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "YoChat olarak kişisel verilerinizin güvenliğini ciddiye alıyoruz. Bu politika, hangi verilerin toplandığını, nasıl kullanıldığını, ne kadar süre saklandığını ve haklarınızı açıklar."
                  : "At YoChat, we take the security of your personal data seriously. This policy explains what data is collected, how it is used, how long it is retained, and your rights."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "1. Kapsam" : "1. Scope"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Bu politika, YoChat web sitesi ve SaaS paneli üzerinden sunulan hizmetler için geçerlidir. YoChat, işletmelerin WhatsApp, Instagram ve Facebook üzerinden müşteri iletişimini yönetmesini sağlayan bir platformdur."
                  : "This policy applies to services provided through the YoChat website and SaaS dashboard. YoChat is a platform that helps businesses manage customer communication across WhatsApp, Instagram, and Facebook."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "2. Toplanan Veriler" : "2. Data We Collect"}</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-2">{isTR ? "Meta Entegrasyonu:" : "Meta Integration:"}</p>
                  <ul className="list-disc list-inside text-[14px] text-[#8a8f98] space-y-1 ml-2">
                    <li>{isTR ? "WhatsApp Business hesap bilgileri ve mesaj içerikleri" : "WhatsApp Business account information and message contents"}</li>
                    <li>{isTR ? "Instagram Direct mesajları ve hesap bilgileri" : "Instagram Direct messages and account information"}</li>
                    <li>{isTR ? "Facebook Messenger mesajları ve sayfa bilgileri" : "Facebook Messenger messages and page information"}</li>
                    <li>{isTR ? "Kişi bilgileri (ad, telefon, e-posta)" : "Contact information (name, phone, email)"}</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-2">{isTR ? "Kullanıcı Verileri:" : "User Data:"}</p>
                  <ul className="list-disc list-inside text-[14px] text-[#8a8f98] space-y-1 ml-2">
                    <li>{isTR ? "Hesap bilgileri (ad, e-posta, şifre hash'i)" : "Account information (name, email, password hash)"}</li>
                    <li>{isTR ? "Organizasyon bilgileri (şirket adı, plan)" : "Organization information (company name, plan)"}</li>
                    <li>{isTR ? "Kullanım verileri (sayfa görüntülenmeleri, işlem kayıtları)" : "Usage data (page views, action logs)"}</li>
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-300 mb-2">{isTR ? "AI Entegrasyonu:" : "AI Integration:"}</p>
                  <ul className="list-disc list-inside text-[14px] text-[#8a8f98] space-y-1 ml-2">
                    <li>{isTR ? "Google Gemini AI'a gönderilen mesaj içerikleri (chatbot yanıtı için)" : "Message contents sent to Google Gemini AI (for chatbot responses)"}</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "3. Verilerin Kullanımı" : "3. How We Use Data"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Toplanan veriler yalnızca platform hizmetlerinin sunulması, müşteri iletişiminin yönetilmesi, AI chatbot yanıtlarının üretilmesi ve hizmet kalitesinin iyileştirilmesi amacıyla kullanılır."
                  : "Collected data is used solely for providing platform services, managing customer communications, generating AI chatbot responses, and improving service quality."}
              </p>
              <p className="text-[14px] text-emerald-400/80 font-medium mt-3">
                {isTR
                  ? "Meta kullanıcı verileri üçüncü taraflara satılmaz, lisanslanmaz veya aktarılmaz."
                  : "Meta user data is not sold, licensed, or transferred to any third party."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "4. Veri Güvenliği" : "4. Data Security"}</h2>
              <ul className="list-disc list-inside text-[14px] text-[#8a8f98] space-y-1 ml-2">
                <li>{isTR ? "Tüm veriler SSL şifreleme ile korunur" : "All data is protected with SSL encryption"}</li>
                <li>{isTR ? "Erişim tokenları şifrelenerek saklanır (Fernet encryption)" : "Access tokens are stored encrypted (Fernet encryption)"}</li>
                <li>{isTR ? "Supabase altyapısı üzerinde Row Level Security (RLS) ile çoklu kiracı izolasyonu" : "Multi-tenant isolation through Row Level Security (RLS) on Supabase infrastructure"}</li>
                <li>{isTR ? "Erişim anahtarları asla URL'lerde paylaşılmaz" : "Access keys are never shared in URLs"}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "5. Veri Saklama Süresi" : "5. Data Retention"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Mesaj verileri hesabınız aktif olduğu sürece saklanır. Hesap silindiğinde veya entegrasyon kaldırıldığında, verileriniz en geç 90 gün içinde sistemlerimizden kaldırılır."
                  : "Message data is retained as long as your account is active. When your account is deleted or an integration is removed, your data is removed from our systems within 90 days."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "6. Üçüncü Taraf Hizmetler" : "6. Third-Party Services"}</h2>
              <ul className="list-disc list-inside text-[14px] text-[#8a8f98] space-y-1 ml-2">
                <li><strong className="text-gray-300">Meta</strong> — {isTR ? "WhatsApp Cloud API, Instagram Graph API, Facebook Pages API" : "WhatsApp Cloud API, Instagram Graph API, Facebook Pages API"}</li>
                <li><strong className="text-gray-300">Google</strong> — {isTR ? "Gemini AI (chatbot yanıtları)" : "Gemini AI (chatbot responses)"}</li>
                <li><strong className="text-gray-300">Supabase</strong> — {isTR ? "Veritabanı ve kimlik doğrulama" : "Database and authentication"}</li>
                <li><strong className="text-gray-300">Vercel</strong> — {isTR ? "Web barındırma" : "Web hosting"}</li>
              </ul>
              <p className="text-[14px] text-[#8a8f98] mt-3">{isTR ? "Bu hizmetlerin kendi gizlilik politikaları geçerlidir." : "These services have their own privacy policies."}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "7. Kullanıcı Hakları" : "7. User Rights"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Verilerinizin silinmesini, düzeltilmesini veya taşınmasını talep edebilirsiniz. Talepleriniz için info@yodijital.com adresine e-posta gönderebilirsiniz."
                  : "You can request deletion, correction, or transfer of your data. For requests, send an email to info@yodijital.com."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "8. Yasal Dayanak" : "8. Legal Basis"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Bu politika, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve AB Genel Veri Koruma Tüzüğü (GDPR) ile uyumludur."
                  : "This policy complies with Turkish Personal Data Protection Law (KVKK) No. 6698 and EU General Data Protection Regulation (GDPR)."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "9. Değişiklikler" : "9. Changes"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Bu politika periyodik olarak güncellenebilir. Güncel sürüm her zaman bu sayfada yayınlanır."
                  : "This policy may be updated periodically. The current version is always published on this page."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "10. İletişim" : "10. Contact"}</h2>
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
