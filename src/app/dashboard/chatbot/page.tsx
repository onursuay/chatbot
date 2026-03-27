"use client"
export default function ChatbotPage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6">AI Chatbot</h2>
      <div className="bg-dark-900 border border-dark-800 rounded-xl p-8 text-center text-dark-600">
        <div className="text-4xl mb-3">🤖</div>
        <p className="text-[15px]">AI chatbot yapılandırması — Faz 2'de aktif edilecek.</p>
        <p className="text-sm mt-2">System prompt, model seçimi, sıcaklık ayarı ve daha fazlası.</p>
      </div>
    </div>
  )
}
