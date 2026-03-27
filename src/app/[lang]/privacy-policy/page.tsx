"use client"

import { useI18n } from "@/lib/i18n"

export default function PrivacyPolicyPage() {
  const { t, lang } = useI18n()
  const isTR = lang === "tr"

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        {isTR ? "Gizlilik Politikası" : "Privacy Policy"}
      </h1>
      <div className="text-dark-300 text-sm space-y-4 leading-relaxed">
        <p><strong>{isTR ? "Son güncelleme:" : "Last updated:"}</strong> 2025-03-28</p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "1. Toplanan Veriler" : "1. Data We Collect"}
        </h2>
        <p>
          {isTR
            ? "YoChat platformu, hizmet sunmak için aşağıdaki verileri toplar: ad, e-posta adresi, telefon numarası, WhatsApp/Instagram/Facebook mesaj içerikleri, şirket bilgileri ve kullanım verileri."
            : "YoChat platform collects the following data to provide services: name, email address, phone number, WhatsApp/Instagram/Facebook message contents, company information, and usage data."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "2. Verilerin Kullanımı" : "2. How We Use Data"}
        </h2>
        <p>
          {isTR
            ? "Toplanan veriler yalnızca platform hizmetlerinin sunulması, müşteri iletişiminin yönetilmesi ve hizmet kalitesinin iyileştirilmesi amacıyla kullanılır. Verileriniz üçüncü taraflarla pazarlama amacıyla paylaşılmaz."
            : "Collected data is used solely for providing platform services, managing customer communications, and improving service quality. Your data is not shared with third parties for marketing purposes."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "3. Veri Güvenliği" : "3. Data Security"}
        </h2>
        <p>
          {isTR
            ? "Verileriniz SSL şifreleme ile korunur. Erişim tokenları şifreli olarak saklanır. Supabase altyapısı üzerinde Row Level Security (RLS) ile çoklu kiracı izolasyonu sağlanır."
            : "Your data is protected with SSL encryption. Access tokens are stored encrypted. Multi-tenant isolation is ensured through Row Level Security (RLS) on Supabase infrastructure."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "4. Üçüncü Taraf Hizmetler" : "4. Third-Party Services"}
        </h2>
        <p>
          {isTR
            ? "Platform, Meta (WhatsApp, Instagram, Facebook), Google (Gemini AI) ve Supabase hizmetlerini kullanır. Bu hizmetlerin kendi gizlilik politikaları geçerlidir."
            : "The platform uses Meta (WhatsApp, Instagram, Facebook), Google (Gemini AI), and Supabase services. Their own privacy policies apply."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "5. İletişim" : "5. Contact"}
        </h2>
        <p>
          {isTR
            ? "Gizlilik politikasıyla ilgili sorularınız için: onursuay@hotmail.com"
            : "For questions about this privacy policy: onursuay@hotmail.com"}
        </p>
      </div>
    </div>
  )
}
