"use client"

import { useI18n } from "@/lib/i18n"

export default function TermsOfServicePage() {
  const { lang } = useI18n()
  const isTR = lang === "tr"

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        {isTR ? "Kullanım Koşulları" : "Terms of Service"}
      </h1>
      <div className="text-dark-300 text-sm space-y-4 leading-relaxed">
        <p><strong>{isTR ? "Son güncelleme:" : "Last updated:"}</strong> 2025-03-28</p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "1. Hizmet Tanımı" : "1. Service Description"}
        </h2>
        <p>
          {isTR
            ? "YoChat, işletmelere WhatsApp, Instagram ve Facebook üzerinden müşteri iletişimi yönetimi sağlayan bir SaaS platformudur."
            : "YoChat is a SaaS platform that provides businesses with customer communication management across WhatsApp, Instagram, and Facebook."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "2. Kullanıcı Sorumlulukları" : "2. User Responsibilities"}
        </h2>
        <p>
          {isTR
            ? "Kullanıcılar, platformu yasal amaçlarla kullanmayı, spam göndermemeyi ve Meta'nın kullanım politikalarına uymayı kabul eder."
            : "Users agree to use the platform for lawful purposes, not to send spam, and to comply with Meta's usage policies."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "3. Hesap Güvenliği" : "3. Account Security"}
        </h2>
        <p>
          {isTR
            ? "Kullanıcılar hesap bilgilerinin güvenliğinden sorumludur. Yetkisiz erişim durumunda derhal bildirim yapılmalıdır."
            : "Users are responsible for the security of their account credentials. Any unauthorized access must be reported immediately."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "4. Hizmet Değişiklikleri" : "4. Service Changes"}
        </h2>
        <p>
          {isTR
            ? "YoChat, hizmet özelliklerini ve fiyatlandırmayı önceden bildirimde bulunarak değiştirme hakkını saklı tutar."
            : "YoChat reserves the right to modify service features and pricing with prior notice."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "5. Sorumluluk Sınırı" : "5. Limitation of Liability"}
        </h2>
        <p>
          {isTR
            ? "YoChat, üçüncü taraf hizmetlerindeki (Meta API, Google AI) kesintilerden kaynaklanan doğrudan veya dolaylı zararlardan sorumlu tutulamaz."
            : "YoChat shall not be liable for direct or indirect damages caused by interruptions in third-party services (Meta API, Google AI)."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "6. İletişim" : "6. Contact"}
        </h2>
        <p>onursuay@hotmail.com</p>
      </div>
    </div>
  )
}
