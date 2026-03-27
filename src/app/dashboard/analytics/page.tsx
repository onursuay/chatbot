"use client"

export default function AnalyticsPage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Raporlar</h2>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Toplam Mesaj", value: "—", change: "+0%" },
          { label: "Aktif Konuşmalar", value: "—", change: "+0%" },
          { label: "Bot Çözüm Oranı", value: "—", change: "+0%" },
          { label: "Ort. Yanıt Süresi", value: "—", change: "+0%" },
        ].map((stat) => (
          <div key={stat.label} className="bg-dark-900 border border-dark-800 rounded-xl p-5">
            <p className="text-sm text-dark-400">{stat.label}</p>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
            <p className="text-xs text-brand-400 mt-1">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="bg-dark-900 border border-dark-800 rounded-xl p-8 text-center text-dark-600">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-[15px]">WhatsApp numaranızı bağladıktan sonra analitik veriler burada görünecek.</p>
      </div>
    </div>
  )
}
