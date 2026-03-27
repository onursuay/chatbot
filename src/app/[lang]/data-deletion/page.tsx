"use client"

import { useI18n } from "@/lib/i18n"

export default function DataDeletionPage() {
  const { lang } = useI18n()
  const isTR = lang === "tr"

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        {isTR ? "Veri Silme Talebi" : "Data Deletion Request"}
      </h1>
      <div className="text-dark-300 text-sm space-y-4 leading-relaxed">
        <p><strong>{isTR ? "Son güncelleme:" : "Last updated:"}</strong> 2025-03-28</p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "Verilerinizin Silinmesini Talep Etme" : "Requesting Data Deletion"}
        </h2>
        <p>
          {isTR
            ? "YoChat platformunda saklanan kişisel verilerinizin silinmesini talep edebilirsiniz. Veri silme talebiniz en geç 30 gün içinde işleme alınır."
            : "You can request the deletion of your personal data stored on the YoChat platform. Your data deletion request will be processed within 30 days."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "Nasıl Talep Ederim?" : "How to Request?"}
        </h2>
        <div className="bg-dark-900 border border-dark-800 rounded-lg p-4 space-y-3">
          <p>
            {isTR
              ? "Aşağıdaki bilgilerle birlikte e-posta gönderin:"
              : "Send an email with the following information:"}
          </p>
          <ul className="list-disc list-inside space-y-1 text-dark-400">
            <li>{isTR ? "Kayıtlı e-posta adresiniz" : "Your registered email address"}</li>
            <li>{isTR ? "Organizasyon adınız" : "Your organization name"}</li>
            <li>{isTR ? "Silme talebinizin kapsamı (tüm veriler veya belirli veriler)" : "Scope of deletion request (all data or specific data)"}</li>
          </ul>
          <div className="mt-4 p-3 bg-dark-800 rounded-lg">
            <p className="text-white font-medium text-sm">
              {isTR ? "E-posta:" : "Email:"} <a href="mailto:onursuay@hotmail.com" className="text-brand-400 hover:underline">onursuay@hotmail.com</a>
            </p>
            <p className="text-dark-500 text-xs mt-1">
              {isTR ? "Konu: Veri Silme Talebi" : "Subject: Data Deletion Request"}
            </p>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "Silinecek Veriler" : "Data That Will Be Deleted"}
        </h2>
        <ul className="list-disc list-inside space-y-1 text-dark-400">
          <li>{isTR ? "Hesap bilgileri (ad, e-posta, şifre)" : "Account information (name, email, password)"}</li>
          <li>{isTR ? "Mesaj geçmişi" : "Message history"}</li>
          <li>{isTR ? "Kişi listeleri" : "Contact lists"}</li>
          <li>{isTR ? "Chatbot yapılandırmaları" : "Chatbot configurations"}</li>
          <li>{isTR ? "Otomasyon kuralları" : "Automation rules"}</li>
          <li>{isTR ? "WhatsApp/Instagram/Facebook bağlantı verileri" : "WhatsApp/Instagram/Facebook connection data"}</li>
        </ul>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "Önemli Not" : "Important Note"}
        </h2>
        <p>
          {isTR
            ? "Veri silme işlemi geri alınamaz. Silinen veriler kurtarılamaz. Meta (WhatsApp/Instagram/Facebook) tarafında tutulan veriler için ayrıca Meta'ya başvurmanız gerekebilir."
            : "Data deletion is irreversible. Deleted data cannot be recovered. For data held by Meta (WhatsApp/Instagram/Facebook), you may need to contact Meta separately."}
        </p>
      </div>
    </div>
  )
}
