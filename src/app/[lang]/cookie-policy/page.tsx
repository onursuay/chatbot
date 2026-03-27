"use client"

import { useI18n } from "@/lib/i18n"

export default function CookiePolicyPage() {
  const { lang } = useI18n()
  const isTR = lang === "tr"

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        {isTR ? "Çerez Politikası" : "Cookie Policy"}
      </h1>
      <div className="text-dark-300 text-sm space-y-4 leading-relaxed">
        <p><strong>{isTR ? "Son güncelleme:" : "Last updated:"}</strong> 2025-03-28</p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "1. Çerezler Nedir?" : "1. What Are Cookies?"}
        </h2>
        <p>
          {isTR
            ? "Çerezler, web sitemizi ziyaret ettiğinizde tarayıcınıza kaydedilen küçük metin dosyalarıdır."
            : "Cookies are small text files stored in your browser when you visit our website."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "2. Kullandığımız Çerezler" : "2. Cookies We Use"}
        </h2>
        <p>
          {isTR
            ? "Zorunlu çerezler: Oturum yönetimi (JWT token), dil tercihi. Bu çerezler platform çalışması için gereklidir ve devre dışı bırakılamaz."
            : "Essential cookies: Session management (JWT token), language preference. These cookies are required for platform operation and cannot be disabled."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "3. Üçüncü Taraf Çerezleri" : "3. Third-Party Cookies"}
        </h2>
        <p>
          {isTR
            ? "Facebook SDK, WhatsApp Embedded Signup işlemi sırasında kendi çerezlerini kullanabilir. Bu çerezler Meta'nın gizlilik politikasına tabidir."
            : "Facebook SDK may use its own cookies during WhatsApp Embedded Signup. These cookies are subject to Meta's privacy policy."}
        </p>

        <h2 className="text-lg font-semibold text-white mt-6">
          {isTR ? "4. İletişim" : "4. Contact"}
        </h2>
        <p>onursuay@hotmail.com</p>
      </div>
    </div>
  )
}
