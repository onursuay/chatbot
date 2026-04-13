"use client"

import { useParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { useI18n } from "@/lib/i18n"

export default function TermsOfServicePage() {
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
        <h1 className="text-3xl font-bold text-white mb-2">{isTR ? "Kullanim Kosullari" : "Terms of Service"}</h1>
        <p className="text-dark-400 text-sm mb-8">YO Dijital Medya · chatbot.yodijital.com</p>

        <div className="text-dark-300 text-sm space-y-6 leading-relaxed">

          <h2 className="text-xl font-semibold text-white">{isTR ? "1. Taraflar ve Tanimlar" : "1. Parties and Definitions"}</h2>
          <p>{isTR
            ? "Bu kosullar, YO Dijital Medya tarafindan isletilen YoChat platformuna erisen kullanicilari kapsar. YoChat, isletmelerin WhatsApp, Instagram ve Facebook uzerinden musteri iletisimini yonettigi bir SaaS platformudur."
            : "These terms govern users accessing the YoChat platform operated by YO Dijital Medya. YoChat is a SaaS platform where businesses manage customer communication across WhatsApp, Instagram, and Facebook."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "2. Hizmet Tanimi" : "2. Scope of Service"}</h2>
          <p>{isTR
            ? "YoChat, isletmelere WhatsApp Business API, Instagram DM ve Facebook Messenger uzerinden musteri mesajlarini tek panelden yonetme, AI chatbot ile otomatik yanitlama, toplu mesaj gonderimi, satis pipeline yonetimi ve otomasyon olusturma imkani saglar."
            : "YoChat enables businesses to manage customer messages from WhatsApp Business API, Instagram DM, and Facebook Messenger in one panel, auto-reply with AI chatbot, send bulk messages, manage sales pipelines, and create automations."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "3. Kullanici Yetki ve Sorumluluklari" : "3. User Authority and Responsibilities"}</h2>
          <ul className="list-disc list-inside text-dark-400 space-y-1 ml-2">
            <li>{isTR ? "Yalnizca yetkilendirildiginiz hesaplari baglayabilirsiniz" : "You may only connect accounts you are authorized to use"}</li>
            <li>{isTR ? "Platformu yasal amaclarla kullanmayi kabul edersiniz" : "You agree to use the platform for lawful purposes"}</li>
            <li>{isTR ? "Spam gonderimi, yaniltici icerik ve Meta politikalarini ihlal eden kullanim yasaktir" : "Spam, misleading content, and violations of Meta policies are prohibited"}</li>
            <li>{isTR ? "Yetkisiz ucuncu taraf hesap erisimi saglanamaz" : "Unauthorized third-party account access is prohibited"}</li>
          </ul>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "4. Platform ve API Uyumlulugu" : "4. Platform and API Compliance"}</h2>
          <p>{isTR
            ? "YoChat uzerinden yapilan islemler, bagli platformlarin (Meta, Google) kosul ve politikalariyla uyumlu olmalidir. Yetkisiz veri toplama, kotuye kullanim veya yaniltici icerik yasaklanmistir."
            : "Operations through YoChat must comply with connected platforms' (Meta, Google) terms and policies. Unauthorized data collection, misuse, or misleading content is prohibited."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "5. Sorumluluk Siniri" : "5. Limitation of Liability"}</h2>
          <p>{isTR
            ? "Gosterilen veriler bagli platformlardan alinir; gecikme, kota, kesinti veya platform degisiklikleri nedeniyle tutarsizliklar olusabilir. YoChat, ucuncu taraf platform sorunlarindan veya API kisitlamalarindan kaynaklanan zararlardan sinirli olcude sorumludur."
            : "Data displayed derives from connected platforms; discrepancies may occur due to delay, quotas, outages, or platform changes. YoChat's liability is limited regarding damage from third-party platform issues or API constraints."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "6. Hesap Guvenligi" : "6. Account Security"}</h2>
          <p>{isTR
            ? "Kullanicilar hesap guvenligi ve erisim bilgilerinin korunmasindan sorumludur. Yetkisiz erisim durumunda derhal bildirim yapilmalidir."
            : "Users are responsible for account security and access credential protection. Any unauthorized access must be reported immediately."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "7. Fesih" : "7. Termination"}</h2>
          <p>{isTR
            ? "YoChat, kotuye kullanim veya kosullarin ihlali durumunda hesap erisimini askiya alma veya sonlandirma hakkini sakli tutar."
            : "YoChat reserves the right to suspend or terminate account access following misuse or violation of terms."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "8. Degisiklikler" : "8. Changes"}</h2>
          <p>{isTR
            ? "Bu kosullar periyodik olarak guncellenebilir. Guncel surum her zaman bu sayfada yayinlanir."
            : "These terms may be updated periodically. The current version is always published on this page."}</p>

          <h2 className="text-xl font-semibold text-white mt-8">{isTR ? "9. Iletisim" : "9. Contact"}</h2>
          <p><a href="mailto:info@yodijital.com" className="text-brand-400 hover:underline">info@yodijital.com</a></p>
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
