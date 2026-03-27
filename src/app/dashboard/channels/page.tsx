"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || ""
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID || ""

interface ChannelStatus {
  whatsapp: { connected: boolean }
  instagram: { connected: boolean; page_id: string | null; page_name: string | null }
  facebook: { connected: boolean; page_id: string | null; page_name: string | null }
}

interface WAStatus {
  connected: boolean
  waba_id?: string
  waba_name?: string
  phone_numbers?: { id: string; number: string; verified_name: string | null }[]
}

declare global {
  interface Window { FB: any }
}

export default function ChannelsPage() {
  const { getToken } = useAuth()
  const [channels, setChannels] = useState<ChannelStatus | null>(null)
  const [waStatus, setWaStatus] = useState<WAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    Promise.all([
      api<ChannelStatus>("/channels", { token }),
      api<WAStatus>("/embedded-signup/status", { token }),
    ]).then(([ch, wa]) => {
      setChannels(ch)
      setWaStatus(wa)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [getToken])

  // WhatsApp Embedded Signup
  const connectWhatsApp = () => {
    if (!window.FB) return alert("Facebook SDK yüklenemedi. Sayfayı yenileyin.")
    setConnecting("whatsapp")

    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          sendWhatsAppCode(response.authResponse.code)
        } else {
          setConnecting(null)
        }
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
      }
    )
  }

  const sendWhatsAppCode = async (code: string) => {
    try {
      const token = getToken()
      if (!token) return
      await api("/embedded-signup/connect", {
        method: "POST", token,
        body: JSON.stringify({ code }),
      })
      const wa = await api<WAStatus>("/embedded-signup/status", { token })
      setWaStatus(wa)
    } catch (err: any) {
      alert(err.message || "Bağlantı sırasında bir hata oluştu.")
    } finally {
      setConnecting(null)
    }
  }

  // Instagram / Facebook bağla
  const connectChannel = (channel: "instagram" | "facebook") => {
    if (!window.FB) return alert("Facebook SDK yüklenemedi")
    setConnecting(channel)

    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          window.FB.api("/me/accounts", { access_token: response.authResponse.accessToken }, async (pagesRes: any) => {
            if (pagesRes.data && pagesRes.data.length > 0) {
              const page = pagesRes.data[0]
              const token = getToken()
              if (!token) return
              try {
                await api("/channels", {
                  method: "POST", token,
                  body: JSON.stringify({ channel, page_access_token: page.access_token, page_id: page.id }),
                })
                const updated = await api<ChannelStatus>("/channels", { token })
                setChannels(updated)
              } catch (err: any) {
                alert(err.message || "Bağlantı hatası")
              }
            } else {
              alert("Bağlı Facebook sayfası bulunamadı")
            }
            setConnecting(null)
          })
        } else {
          setConnecting(null)
        }
      },
      {
        scope: channel === "instagram"
          ? "instagram_basic,instagram_manage_messages,pages_show_list,pages_messaging"
          : "pages_show_list,pages_messaging,pages_read_engagement",
      }
    )
  }

  const channelList = [
    {
      id: "whatsapp" as const,
      name: "WhatsApp",
      desc: "WhatsApp Business API ile mesajlaşma",
      color: "bg-green-500",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        </svg>
      ),
    },
    {
      id: "instagram" as const,
      name: "Instagram DM",
      desc: "Instagram Direct mesajlarını yönetin",
      color: "bg-gradient-to-br from-purple-500 to-pink-500",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
          <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="white" strokeWidth="2"/>
          <circle cx="12" cy="12" r="5" fill="none" stroke="white" strokeWidth="2"/>
          <circle cx="18" cy="6" r="1.5" fill="white"/>
        </svg>
      ),
    },
    {
      id: "facebook" as const,
      name: "Facebook Messenger",
      desc: "Facebook sayfa mesajlarını yönetin",
      color: "bg-blue-500",
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.434 5.503 3.678 7.2V22l3.378-1.855c.9.25 1.855.384 2.944.384 5.523 0 10-4.144 10-9.243C22 6.145 17.523 2 12 2z"/>
        </svg>
      ),
    },
  ]

  if (loading) return <div className="p-6 text-dark-400 text-sm">Yükleniyor...</div>

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-white mb-2">Kanal Yönetimi</h2>
      <p className="text-dark-400 text-sm mb-6">WhatsApp, Instagram ve Facebook mesajlarını tek yerden yönetin</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {channelList.map((ch) => {
          const isWhatsApp = ch.id === "whatsapp"
          const waConnected = waStatus?.connected || false
          const igFbConnected = channels?.[ch.id]?.connected || false
          const connected = isWhatsApp ? waConnected : igFbConnected

          return (
            <div key={ch.id} className={`bg-dark-900 border rounded-xl p-6 ${connected ? "border-brand-500/30" : "border-dark-800"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 ${ch.color} rounded-lg flex items-center justify-center`}>
                  {ch.icon}
                </div>
                <div>
                  <h3 className="text-white font-medium">{ch.name}</h3>
                  <p className="text-xs text-dark-500">{ch.desc}</p>
                </div>
              </div>

              {connected ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-green-400 text-sm">Bağlı</span>
                  </div>
                  {isWhatsApp && waStatus?.waba_name && (
                    <p className="text-xs text-dark-400">{waStatus.waba_name}</p>
                  )}
                  {isWhatsApp && waStatus?.phone_numbers?.map((p) => (
                    <p key={p.id} className="text-xs text-dark-300 mt-1">{p.number} {p.verified_name && `(${p.verified_name})`}</p>
                  ))}
                  {!isWhatsApp && (channels?.[ch.id] as any)?.page_name && (
                    <p className="text-xs text-dark-400">{(channels?.[ch.id] as any).page_name}</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => isWhatsApp ? connectWhatsApp() : connectChannel(ch.id as "instagram" | "facebook")}
                  disabled={connecting === ch.id}
                  className="w-full bg-dark-800 hover:bg-dark-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {connecting === ch.id ? "Bağlanıyor..." : "Bağla"}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-8 bg-dark-900 border border-dark-800 rounded-xl p-6">
        <h3 className="text-white font-medium mb-2">Nasıl Çalışır?</h3>
        <ul className="text-sm text-dark-400 space-y-2">
          <li>1. WhatsApp, Instagram veya Facebook sayfanızı bağlayın</li>
          <li>2. Gelen mesajlar otomatik olarak Inbox'a düşer</li>
          <li>3. AI Bot tüm kanallarda aynı şekilde çalışır</li>
          <li>4. Tek panelden tüm mesajları yönetin</li>
        </ul>
      </div>
    </div>
  )
}
