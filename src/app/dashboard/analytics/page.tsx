"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface AnalyticsData {
  overview: {
    total_conversations: number
    open_conversations: number
    resolved_conversations: number
    total_messages: number
    inbound_messages: number
    outbound_messages: number
    bot_messages: number
    agent_messages: number
    total_contacts: number
    total_broadcasts: number
  }
  daily_chart: { date: string; inbound: number; outbound: number }[]
}

export default function AnalyticsPage() {
  const { getToken } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<AnalyticsData>("/analytics", { token })
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [getToken])

  const o = data?.overview

  const stats = o ? [
    { label: "Toplam Mesaj", value: o.total_messages, color: "text-white" },
    { label: "Gelen Mesaj", value: o.inbound_messages, color: "text-blue-400" },
    { label: "Giden Mesaj", value: o.outbound_messages, color: "text-brand-400" },
    { label: "Aktif Konusmalar", value: o.open_conversations, color: "text-yellow-400" },
    { label: "Çözülen Konusmalar", value: o.resolved_conversations, color: "text-green-400" },
    { label: "Toplam Kisiler", value: o.total_contacts, color: "text-purple-400" },
    { label: "Bot Mesajlari", value: o.bot_messages, color: "text-brand-400" },
    { label: "Agent Mesajlari", value: o.agent_messages, color: "text-orange-400" },
  ] : []

  const botRate = o && o.outbound_messages > 0
    ? Math.round((o.bot_messages / o.outbound_messages) * 100)
    : 0

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Raporlar ve Analitik</h2>

      {loading ? (
        <p className="text-dark-400 text-sm">Yükleniyor...</p>
      ) : !data ? (
        <p className="text-dark-400 text-sm">Veri yüklenemedi</p>
      ) : (
        <>
          {/* KPI kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-dark-900 border border-dark-800 rounded-xl p-5">
                <p className="text-sm text-dark-400">{stat.label}</p>
                <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Bot performansı */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
              <p className="text-sm text-dark-400 mb-2">Bot Çözüm Oranı</p>
              <p className="text-3xl font-bold text-brand-400">{botRate}%</p>
              <div className="w-full bg-dark-800 rounded-full h-2 mt-3">
                <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${botRate}%` }} />
              </div>
            </div>
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
              <p className="text-sm text-dark-400 mb-2">Toplam Konusmalar</p>
              <p className="text-3xl font-bold text-white">{o?.total_conversations}</p>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-yellow-400">{o?.open_conversations} açık</span>
                <span className="text-green-400">{o?.resolved_conversations} çözüldü</span>
              </div>
            </div>
            <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
              <p className="text-sm text-dark-400 mb-2">Kampanyalar</p>
              <p className="text-3xl font-bold text-white">{o?.total_broadcasts}</p>
              <p className="text-xs text-dark-500 mt-2">Toplam gonderilen kampanya</p>
            </div>
          </div>

          {/* Son 7 gün grafik (basit bar chart) */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
            <h3 className="text-white font-medium mb-4">Son 7 Gun - Mesaj Aktivitesi</h3>
            <div className="flex items-end gap-2 h-40">
              {data.daily_chart.map((day) => {
                const maxVal = Math.max(...data.daily_chart.map((d) => d.inbound + d.outbound), 1)
                const height = ((day.inbound + day.outbound) / maxVal) * 100
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: "140px" }}>
                      <div
                        className="w-full max-w-[40px] bg-brand-500/30 rounded-t-md relative group"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-dark-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                          {day.inbound + day.outbound} mesaj
                        </div>
                        <div
                          className="absolute bottom-0 w-full bg-brand-500 rounded-t-md"
                          style={{ height: day.inbound > 0 ? `${(day.inbound / (day.inbound + day.outbound || 1)) * 100}%` : "0%" }}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-dark-500">{day.date}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 mt-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-brand-500 rounded" /> Gelen</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-brand-500/30 rounded" /> Giden</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
