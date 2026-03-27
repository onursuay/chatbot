"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

interface ChatbotConfig {
  id: string
  name: string
  is_active: boolean
  ai_provider: string
  ai_model: string
  system_prompt: string
  temperature: number
  max_tokens: number
  welcome_message: string | null
  transfer_keywords: string[]
  close_keywords: string[]
}

export default function ChatbotPage() {
  const { user, getToken } = useAuth()
  const [config, setConfig] = useState<ChatbotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user?.org_id) return
    const load = async () => {
      const { data } = await supabase
        .from("chatbot_configs")
        .select("*")
        .eq("org_id", user.org_id)
        .eq("is_active", true)
        .single()
      if (data) setConfig(data as ChatbotConfig)
      setLoading(false)
    }
    load()
  }, [user])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    setSaved(false)
    const { error } = await supabase
      .from("chatbot_configs")
      .update({
        system_prompt: config.system_prompt,
        ai_model: config.ai_model,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        welcome_message: config.welcome_message,
        is_active: config.is_active,
      })
      .eq("id", config.id)

    if (!error) setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div className="p-6 text-dark-400 text-sm">Yukleniyor...</div>
  if (!config) return <div className="p-6 text-dark-400 text-sm">Chatbot yapilandirmasi bulunamadi</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">AI Chatbot Ayarlari</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-brand-400 text-sm">Kaydedildi</span>}
          <button onClick={handleSave} disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-50">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Aktif/Pasif */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">Bot Durumu</h3>
              <p className="text-sm text-dark-400 mt-1">Yeni konusmalarda bot otomatik olarak aktif olsun mu?</p>
            </div>
            <button
              onClick={() => setConfig({ ...config, is_active: !config.is_active })}
              className={`w-12 h-6 rounded-full transition relative ${config.is_active ? "bg-brand-500" : "bg-dark-700"}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition ${config.is_active ? "left-6" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <h3 className="text-white font-medium mb-3">Sistem Promptu</h3>
          <p className="text-sm text-dark-400 mb-3">Bot'un kisiligini ve davranisini belirleyin</p>
          <textarea
            value={config.system_prompt}
            onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 h-40 resize-none"
            placeholder="Ornek: Sen bir WhatsApp muesteri hizmetleri asistanisin..."
          />
        </div>

        {/* Karsilama Mesaji */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <h3 className="text-white font-medium mb-3">Karsilama Mesaji</h3>
          <p className="text-sm text-dark-400 mb-3">Yeni konusma basladiginda gonderilecek ilk mesaj (opsiyonel)</p>
          <textarea
            value={config.welcome_message || ""}
            onChange={(e) => setConfig({ ...config, welcome_message: e.target.value || null })}
            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 h-20 resize-none"
            placeholder="Merhaba! Size nasil yardimci olabilirim?"
          />
        </div>

        {/* Model Ayarlari */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <h3 className="text-white font-medium mb-4">Model Ayarlari</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-dark-400 mb-1">AI Model</label>
              <select value={config.ai_model}
                onChange={(e) => setConfig({ ...config, ai_model: e.target.value })}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Sicaklik: {config.temperature}</label>
              <input type="range" min="0" max="1" step="0.1" value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full accent-brand-500" />
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Max Token</label>
              <input type="number" value={config.max_tokens}
                onChange={(e) => setConfig({ ...config, max_tokens: parseInt(e.target.value) || 300 })}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
