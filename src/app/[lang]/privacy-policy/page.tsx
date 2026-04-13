"use client"

import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useI18n } from "@/lib/i18n"

export default function PrivacyPolicyPage() {
  const { lang: urlLang } = useParams()
  const { lang, t } = useI18n()

  const isTR = lang === "tr"
  const prefix = `/${lang}`

  return (
    <div className="min-h-screen bg-[#060609] text-white" style={{ fontSize: "16px" }}>
      <header className="w-full border-b border-white/[0.05] py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={prefix}>
            <Image src="/logo.png" alt="YO Dijital" width={90} height={32} className="object-contain brightness-0 invert" />
          </Link>
          <Link href={prefix} className="text-sm text-gray-400 hover:text-white transition-colors">
            {isTR ? "← Ana Sayfa" : "← Home"}
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-dark-500 text-xs mb-2">{isTR ? "Son guncelleme: 28 Mart 2026" : "Last updated: March 28, 2026"}</p>
        <h1 className="text-3xl font-bold text-white mb-2">{isTR ? "Gizlilik Politikasi" : "Privacy Policy"}</h1>
        <p className="text-dark-400 text-sm mb-8">YO Dijital Medya · chatbot.yodijital.com</p>

        <div className="text-dark-300 text-sm space-y-6 leading-relaxed">
          <p>{isTR
            ? "YoChat olarak kisisel verilerinizin guvenligini ciddiye aliyoruz. Bu politika, hangi verilerin toplandigini, nasil kullanildigini, ne kadar sure saklandigini ve haklarinizi aciklar."
            : "At YoChat, we take the security of your personal data seriously. This policy explains what data is collected, how it is used, how long it is retained, and your rights."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "1. Kapsam" : "1. Scope"}</h2>
          <p>{isTR
            ? "Bu politika, YoChat web sitesi ve SaaS paneli uzerinden sunulan hizmetler icin gecerlidir. YoChat, isletmelerin WhatsApp, Instagram ve Facebook uzerinden musteri iletisimini yonetmesini saglayan bir platformdur."
            : "This policy applies to services provided through the YoChat website and SaaS dashboard. YoChat is a platform that helps businesses manage customer communication across WhatsApp, Instagram, and Facebook."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "2. Toplanan Veriler" : "2. Data We Collect"}</h2>
          <div className="space-y-3">
            <p className="font-medium text-white">{isTR ? "Meta Entegrasyonu:" : "Meta Integration:"}</p>
            <ul className="list-disc list-inside text-dark-400 space-y-1 ml-2">
              <li>{isTR ? "WhatsApp Business hesap bilgileri ve mesaj icerikleri" : "WhatsApp Business account information and message contents"}</li>
              <li>{isTR ? "Instagram Direct mesajlari ve hesap bilgileri" : "Instagram Direct messages and account information"}</li>
              <li>{isTR ? "Facebook Messenger mesajlari ve sayfa bilgileri" : "Facebook Messenger messages and page information"}</li>
              <li>{isTR ? "Kisi bilgileri (ad, telefon, e-posta)" : "Contact information (name, phone, email)"}</li>
            </ul>
            <p className="font-medium text-white mt-4">{isTR ? "Kullanici Verileri:" : "User Data:"}</p>
            <ul className="list-disc list-inside text-dark-400 space-y-1 ml-2">
              <li>{isTR ? "Hesap bilgileri (ad, e-posta, sifre hash'i)" : "Account information (name, email, password hash)"}</li>
              <li>{isTR ? "Organizasyon bilgileri (sirket adi, plan)" : "Organization information (company name, plan)"}</li>
              <li>{isTR ? "Kullanim verileri (sayfa goruntulenmeleri, islem kayitlari)" : "Usage data (page views, action logs)"}</li>
            </ul>
            <p className="font-medium text-white mt-4">{isTR ? "AI Entegrasyonu:" : "AI Integration:"}</p>
            <ul className="list-disc list-inside text-dark-400 space-y-1 ml-2">
              <li>{isTR ? "Google Gemini AI'a gonderilen mesaj icerikleri (chatbot yaniti icin)" : "Message contents sent to Google Gemini AI (for chatbot responses)"}</li>
            </ul>
          </div>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "3. Verilerin Kullanimi" : "3. How We Use Data"}</h2>
          <p>{isTR
            ? "Toplanan veriler yalnizca platform hizmetlerinin sunulmasi, musteri iletisiminin yonetilmesi, AI chatbot yanitlarinin uretilmesi ve hizmet kalitesinin iyilestirilmesi amaciyla kullanilir."
            : "Collected data is used solely for providing platform services, managing customer communications, generating AI chatbot responses, and improving service quality."}</p>
          <p className="text-brand-400 font-medium">{isTR
            ? "Meta kullanici verileri ucuncu taraflara satilmaz, lisanslanmaz veya aktarilmaz."
            : "Meta user data is not sold, licensed, or transferred to any third party."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "4. Veri Guvenligi" : "4. Data Security"}</h2>
          <ul className="list-disc list-inside text-dark-400 space-y-1 ml-2">
            <li>{isTR ? "Tum veriler SSL sifreleme ile korunur" : "All data is protected with SSL encryption"}</li>
            <li>{isTR ? "Erisim tokenlari sifrelenerek saklanir (Fernet encryption)" : "Access tokens are stored encrypted (Fernet encryption)"}</li>
            <li>{isTR ? "Supabase altyapisi uzerinde Row Level Security (RLS) ile coklu kiraci izolasyonu" : "Multi-tenant isolation through Row Level Security (RLS) on Supabase infrastructure"}</li>
            <li>{isTR ? "Erisim anahtarlari asla URL'lerde paylasimaz" : "Access keys are never shared in URLs"}</li>
          </ul>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "5. Veri Saklama Suresi" : "5. Data Retention"}</h2>
          <p>{isTR
            ? "Mesaj verileri hesabiniz aktif oldugu surece saklanir. Hesap silindiginde veya entegrasyon kaldirildikinda, verileriniz en gec 90 gun icinde sistemlerimizden kaldirilir."
            : "Message data is retained as long as your account is active. When your account is deleted or an integration is removed, your data is removed from our systems within 90 days."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "6. Ucuncu Taraf Hizmetler" : "6. Third-Party Services"}</h2>
          <ul className="list-disc list-inside text-dark-400 space-y-1 ml-2">
            <li><strong>Meta</strong> — {isTR ? "WhatsApp Cloud API, Instagram Graph API, Facebook Pages API" : "WhatsApp Cloud API, Instagram Graph API, Facebook Pages API"}</li>
            <li><strong>Google</strong> — {isTR ? "Gemini AI (chatbot yanitlari)" : "Gemini AI (chatbot responses)"}</li>
            <li><strong>Supabase</strong> — {isTR ? "Veritabani ve kimlik dogrulama" : "Database and authentication"}</li>
            <li><strong>Vercel</strong> — {isTR ? "Web barindirma" : "Web hosting"}</li>
          </ul>
          <p>{isTR ? "Bu hizmetlerin kendi gizlilik politikalari gecerlidir." : "These services have their own privacy policies."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "7. Kullanici Haklari" : "7. User Rights"}</h2>
          <p>{isTR
            ? "Verilerinizin silinmesini, duzeltilmesini veya tasinmasini talep edebilirsiniz. Talepleriniz icin info@yodijital.com adresine e-posta gonderebilirsiniz."
            : "You can request deletion, correction, or transfer of your data. For requests, send an email to info@yodijital.com."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "8. Yasal Dayanak" : "8. Legal Basis"}</h2>
          <p>{isTR
            ? "Bu politika, 6698 sayili Kisisel Verilerin Korunmasi Kanunu (KVKK) ve AB Genel Veri Koruma Tuzugu (GDPR) ile uyumludur."
            : "This policy complies with Turkish Personal Data Protection Law (KVKK) No. 6698 and EU General Data Protection Regulation (GDPR)."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "9. Degisiklikler" : "9. Changes"}</h2>
          <p>{isTR
            ? "Bu politika periyodik olarak guncellenebilir. Guncel surum her zaman bu sayfada yayinlanir."
            : "This policy may be updated periodically. The current version is always published on this page."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "10. Iletisim" : "10. Contact"}</h2>
          <p>
            <strong>{isTR ? "E-posta:" : "Email:"}</strong>{" "}
            <a href="mailto:info@yodijital.com" className="text-brand-400 hover:underline">info@yodijital.com</a>
          </p>
        </div>

      </div>

      <footer className="w-full border-t border-white/[0.05] py-6 px-6 mt-12">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-5 text-sm text-gray-500">
          <a href={`${prefix}/privacy-policy`} className="hover:text-gray-300 transition-colors">{isTR ? "Gizlilik Politikası" : "Privacy Policy"}</a>
          <a href={`${prefix}/cookie-policy`} className="hover:text-gray-300 transition-colors">{isTR ? "Çerez Politikası" : "Cookie Policy"}</a>
          <a href={`${prefix}/terms-of-service`} className="hover:text-gray-300 transition-colors">{isTR ? "Kullanım Koşulları" : "Terms of Service"}</a>
          <a href={`${prefix}/data-deletion`} className="hover:text-gray-300 transition-colors">{isTR ? "Veri Silme" : "Data Deletion"}</a>
        </div>
      </footer>
    </div>
  )
}
