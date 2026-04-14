"use client"

import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

export default function DataDeletionPage() {
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
          <h1 className="text-3xl font-bold text-white mb-1">{isTR ? "Veri Silme ve Entegrasyon Kaldırma" : "Data Deletion and Integration Removal"}</h1>
          <p className="text-sm text-gray-600 mb-10">YoChat · chatbot.yodijital.com</p>

          <div className="space-y-8">
            <section>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Entegrasyonlarınızı istediğiniz zaman YoChat'ten kaldırabilir ve verilerinizin silinmesini talep edebilirsiniz."
                  : "You can remove integrations from YoChat at any time and request deletion of your data."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "1. Entegrasyon Kaldırma (Bağlantı Kesme)" : "1. Integration Removal (Disconnect)"}</h2>
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-sm font-semibold text-gray-300 mb-2">WhatsApp</p>
                  <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                    {isTR
                      ? "Bağlantı kesildiğinde senkronizasyon durdurulur. Saklanan yetkilendirme verileri (access token) iptal edilir. WABA hesap eşleşmesi silinmek üzere kuyruğa alınır."
                      : "When disconnecting, synchronization is stopped. Stored authorization data (access token) is revoked. WABA account mapping is queued for deletion."}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <p className="text-sm font-semibold text-gray-300 mb-2">Instagram / Facebook</p>
                  <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                    {isTR
                      ? "Bağlantı kesildiğinde senkronizasyon durdurulur. Sayfa erişim tokeni ve hesap eşleşmesi silinmek üzere kuyruğa alınır."
                      : "When disconnecting, synchronization is stopped. Page access token and account mapping are queued for deletion."}
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "2. Silinen Verilerin Kapsamı" : "2. Scope of Deleted Data"}</h2>
              <ul className="list-disc list-inside text-[14px] text-[#8a8f98] space-y-1 ml-2">
                <li>{isTR ? "Entegrasyon tokenları ve yetkilendirme kayıtları" : "Integration tokens and authorization records"}</li>
                <li>{isTR ? "Bağlı hesap eşleşmesi" : "Linked account mappings"}</li>
                <li>{isTR ? "Bağlantı metadata'sı" : "Connection metadata"}</li>
                <li>{isTR ? "Mesaj geçmişi" : "Message history"}</li>
                <li>{isTR ? "Kişi listeleri" : "Contact lists"}</li>
                <li>{isTR ? "Chatbot yapılandırmaları" : "Chatbot configurations"}</li>
                <li>{isTR ? "Otomasyon kuralları ve pipeline verileri" : "Automation rules and pipeline data"}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "3. Silme Zamanlaması" : "3. Deletion Timeline"}</h2>
              <p className="text-[14px] text-[#8a8f98] leading-relaxed">
                {isTR
                  ? "Bağlantı kesildikten sonra veriler en geç 90 gün içinde sistemlerimizden kaldırılır. Daha hızlı kaldırma talep edebilirsiniz."
                  : "After disconnection, data is removed from our systems within 90 days at the latest. You may request faster removal."}
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "4. Veri Silme Talebi" : "4. Data Deletion Request"}</h2>
              <p className="text-[14px] text-[#8a8f98] mb-4">
                {isTR ? "Aşağıdaki bilgilerle birlikte e-posta gönderin:" : "Send an email with the following information:"}
              </p>
              <ul className="list-disc list-inside text-[14px] text-[#8a8f98] space-y-1 ml-2 mb-6">
                <li>{isTR ? "Kayıtlı e-posta adresiniz" : "Your registered email address"}</li>
                <li>{isTR ? "Organizasyon adınız" : "Your organization name"}</li>
                <li>{isTR ? "Silinmesini istediğiniz entegrasyonlar" : "Specific integrations you want deleted"}</li>
              </ul>
              <div className="rounded-xl border border-emerald-400/10 bg-white/[0.02] p-5">
                <p className="text-[14px] text-gray-300 font-medium">
                  {isTR ? "E-posta:" : "Email:"}{" "}
                  <a href="mailto:info@yodijital.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">info@yodijital.com</a>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {isTR ? "Konu: YoChat Veri Silme Talebi" : "Subject: YoChat Data Deletion Request"}
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-white">{isTR ? "5. Önemli Not" : "5. Important Note"}</h2>
              <p className="text-[14px] text-yellow-400/80 leading-relaxed font-medium">
                {isTR
                  ? "Veri silme işlemi geri alınamaz. Silinen veriler kurtarılamaz. Meta (WhatsApp/Instagram/Facebook) tarafında tutulan veriler için ayrıca Meta'ya başvurmanız gerekebilir."
                  : "Data deletion is irreversible. Deleted data cannot be recovered. For data held by Meta (WhatsApp/Instagram/Facebook), you may need to contact Meta separately."}
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
