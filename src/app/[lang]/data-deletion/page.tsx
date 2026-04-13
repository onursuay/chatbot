"use client"

import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useI18n } from "@/lib/i18n"

export default function DataDeletionPage() {
  const { lang: urlLang } = useParams()
  const { lang } = useI18n()

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
        <h1 className="text-3xl font-bold text-white mb-2">{isTR ? "Veri Silme ve Entegrasyon Kaldirma" : "Data Deletion and Integration Removal"}</h1>
        <p className="text-gray-500 text-sm mb-8">YoChat · chatbot.yodijital.com</p>

        <div className="text-dark-300 text-sm space-y-6 leading-relaxed">

          <p>{isTR
            ? "Entegrasyonlarinizi istediginiz zaman YoChat'ten kaldirabilir ve verilerinizin silinmesini talep edebilirsiniz."
            : "You can remove integrations from YoChat at any time and request deletion of your data."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "1. Entegrasyon Kaldirma (Baglanti Kesme)" : "1. Integration Removal (Disconnect)"}</h2>

          <div className="bg-dark-900 border border-dark-800 rounded-lg p-4 space-y-4">
            <div>
              <p className="font-medium text-white">WhatsApp</p>
              <p className="text-dark-400 text-xs mt-1">{isTR
                ? "Baglanti kesildiginde senkronizasyon durdurulur. Saklanan yetkilendirme verileri (access token) iptal edilir. WABA hesap eslesmesi silinmek uzere kuyruga alinir."
                : "When disconnecting, synchronization is stopped. Stored authorization data (access token) is revoked. WABA account mapping is queued for deletion."}</p>
            </div>
            <div>
              <p className="font-medium text-white">Instagram / Facebook</p>
              <p className="text-dark-400 text-xs mt-1">{isTR
                ? "Baglanti kesildiginde senkronizasyon durdurulur. Sayfa erisim tokeni ve hesap eslesmesi silinmek uzere kuyruga alinir."
                : "When disconnecting, synchronization is stopped. Page access token and account mapping are queued for deletion."}</p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "2. Silinen Verilerin Kapsami" : "2. Scope of Deleted Data"}</h2>
          <ul className="list-disc list-inside text-dark-400 space-y-1 ml-2">
            <li>{isTR ? "Entegrasyon tokenlari ve yetkilendirme kayitlari" : "Integration tokens and authorization records"}</li>
            <li>{isTR ? "Bagli hesap eslesmesi" : "Linked account mappings"}</li>
            <li>{isTR ? "Baglanti metadata'si" : "Connection metadata"}</li>
            <li>{isTR ? "Mesaj gecmisi" : "Message history"}</li>
            <li>{isTR ? "Kisi listeleri" : "Contact lists"}</li>
            <li>{isTR ? "Chatbot yapilandirmalari" : "Chatbot configurations"}</li>
            <li>{isTR ? "Otomasyon kurallari ve pipeline verileri" : "Automation rules and pipeline data"}</li>
          </ul>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "3. Silme Zamanligi" : "3. Deletion Timeline"}</h2>
          <p>{isTR
            ? "Baglanti kesildikten sonra veriler en gec 90 gun icinde sistemlerimizden kaldirilir. Daha hizli kaldirma talep edebilirsiniz."
            : "After disconnection, data is removed from our systems within 90 days at the latest. You may request faster removal."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "4. Veri Silme Talebi" : "4. Data Deletion Request"}</h2>
          <div className="bg-dark-900 border border-dark-800 rounded-lg p-5">
            <p className="text-dark-300 mb-3">{isTR
              ? "Asagidaki bilgilerle birlikte e-posta gonderin:"
              : "Send an email with the following information:"}</p>
            <ul className="list-disc list-inside text-dark-400 space-y-1 ml-2 mb-4">
              <li>{isTR ? "Kayitli e-posta adresiniz" : "Your registered email address"}</li>
              <li>{isTR ? "Organizasyon adiniz" : "Your organization name"}</li>
              <li>{isTR ? "Silinmesini istediginiz entegrasyonlar" : "Specific integrations you want deleted"}</li>
            </ul>
            <div className="bg-dark-800 rounded-lg p-4">
              <p className="text-white font-medium text-sm">
                {isTR ? "E-posta:" : "Email:"}{" "}
                <a href="mailto:info@yodijital.com" className="text-brand-400 hover:underline">info@yodijital.com</a>
              </p>
              <p className="text-dark-500 text-xs mt-1">
                {isTR ? "Konu: YoChat Veri Silme Talebi" : "Subject: YoChat Data Deletion Request"}
              </p>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "5. Onemli Not" : "5. Important Note"}</h2>
          <p className="text-yellow-400/80">{isTR
            ? "Veri silme islemi geri alinamaz. Silinen veriler kurtarilamaz. Meta (WhatsApp/Instagram/Facebook) tarafinda tutulan veriler icin ayrica Meta'ya basvurmaniz gerekebilir."
            : "Data deletion is irreversible. Deleted data cannot be recovered. For data held by Meta (WhatsApp/Instagram/Facebook), you may need to contact Meta separately."}</p>
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
