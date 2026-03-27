"use client"

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"

type Channel = "all" | "whatsapp" | "instagram" | "facebook"

interface Conversation {
  id: string
  contact_name: string | null
  contact_phone: string | null
  status: string
  last_message_at: string | null
  last_message_preview: string | null
  unread_count: number
  is_bot_active: boolean
  channel?: string
}

interface Message {
  id: string
  direction: string
  type: string
  content: { body?: string }
  status: string
  sender_type: string | null
  created_at: string
}

const CHANNELS: { id: Channel; label: string; color: string; icon: JSX.Element }[] = [
  {
    id: "all",
    label: "all_channels",
    color: "text-white",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    color: "text-[#25D366]",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    color: "text-[#E1306C]",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Messenger",
    color: "text-[#0084FF]",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.908 1.434 5.503 3.678 7.2V22l3.378-1.855c.9.25 1.855.384 2.944.384 5.523 0 10-4.144 10-9.243C22 6.145 17.523 2 12 2z"/>
      </svg>
    ),
  },
]

function getChannelIcon(channel?: string) {
  if (channel === "instagram") return <span className="text-[#E1306C]">{CHANNELS[2].icon}</span>
  if (channel === "facebook") return <span className="text-[#0084FF]">{CHANNELS[3].icon}</span>
  return <span className="text-[#25D366]">{CHANNELS[1].icon}</span>
}

export default function InboxPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
  const [activeChannel, setActiveChannel] = useState<Channel>("all")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Konuşmaları yükle
  const loadConversations = () => {
    const token = getToken()
    if (!token) return
    api<Conversation[]>("/conversations", { token }).then(setConversations).catch(() => {})
  }

  useEffect(() => {
    loadConversations()
  }, [getToken])

  // Mesajları yükle
  useEffect(() => {
    if (!selectedConv) return
    const token = getToken()
    if (!token) return
    api<Message[]>(`/conversations/${selectedConv.id}/messages`, { token })
      .then(setMessages)
      .catch(() => {})
  }, [selectedConv, getToken])

  // Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Supabase Realtime — yeni mesajlar
  useEffect(() => {
    if (!selectedConv) return
    const channel = supabase
      .channel(`messages:${selectedConv.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${selectedConv.id}`,
      }, (payload) => {
        const newMsg = payload.new as Message
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedConv])

  // Supabase Realtime — conversation updates
  useEffect(() => {
    const channel = supabase
      .channel("conversations-updates")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "conversations",
      }, () => { loadConversations() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [getToken])

  // Mesaj gönder
  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv || sending) return
    const token = getToken()
    if (!token) return

    const text = newMessage.trim()
    setNewMessage("")
    setSending(true)

    try {
      const msg = await api<Message>(`/conversations/${selectedConv.id}/messages`, {
        method: "POST",
        token,
        body: JSON.stringify({ text }),
      })
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    } catch (err: any) {
      setNewMessage(text)
      alert(t("msg_send_error") + ": " + (err.message || t("unknown")))
    }
    setSending(false)
  }

  // Konuşma güncelle
  const updateConversation = async (update: Record<string, any>) => {
    if (!selectedConv) return
    const token = getToken()
    if (!token) return

    try {
      await api(`/conversations/${selectedConv.id}/update`, {
        method: "PATCH",
        token,
        body: JSON.stringify(update),
      })
      setSelectedConv({ ...selectedConv, ...update })
      loadConversations()
    } catch {}
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }) + " " +
      d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  }

  // Arama + kanal filtresi
  const filteredConversations = conversations.filter((c) => {
    // Kanal filtresi
    if (activeChannel !== "all") {
      const convChannel = c.channel || "whatsapp"
      if (convChannel !== activeChannel) return false
    }
    // Arama filtresi
    if (!search) return true
    const q = search.toLowerCase()
    return (c.contact_name?.toLowerCase().includes(q)) ||
           (c.contact_phone?.toLowerCase().includes(q)) ||
           (c.last_message_preview?.toLowerCase().includes(q))
  })

  // Kanal bazlı sayılar
  const channelCounts = {
    all: conversations.reduce((sum, c) => sum + c.unread_count, 0),
    whatsapp: conversations.filter((c) => (c.channel || "whatsapp") === "whatsapp").reduce((sum, c) => sum + c.unread_count, 0),
    instagram: conversations.filter((c) => c.channel === "instagram").reduce((sum, c) => sum + c.unread_count, 0),
    facebook: conversations.filter((c) => c.channel === "facebook").reduce((sum, c) => sum + c.unread_count, 0),
  }

  return (
    <div className="h-screen flex">
      {/* Sol Panel — Kanal sekmeleri + Konuşma listesi */}
      <div className="w-80 border-r border-dark-800 flex flex-col">
        {/* Başlık */}
        <div className="p-4 border-b border-dark-800">
          <h2 className="text-lg font-semibold text-white">{t("inbox")}</h2>
          <div className="mt-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        {/* Kanal Sekmeleri */}
        <div className="flex border-b border-dark-800">
          {CHANNELS.map((ch) => {
            const count = channelCounts[ch.id]
            const isActive = activeChannel === ch.id
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 transition relative ${
                  isActive
                    ? `${ch.id === "all" ? "text-brand-400" : ch.color} border-b-2 ${ch.id === "all" ? "border-brand-400" : ch.id === "whatsapp" ? "border-[#25D366]" : ch.id === "instagram" ? "border-[#E1306C]" : "border-[#0084FF]"}`
                    : "text-dark-500 hover:text-dark-300"
                }`}
                title={ch.id === "all" ? t("all") : ch.label}
              >
                <span className={isActive ? ch.color : ""}>{ch.icon}</span>
                {count > 0 && (
                  <span className={`text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ${
                    isActive ? "bg-brand-500 text-dark-950" : "bg-dark-700 text-dark-400"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Konuşma Listesi */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-dark-500 text-sm">
              {search ? t("no_results") : t("no_conversations")}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConv(conv)}
                className={`w-full p-4 border-b border-dark-800 text-left hover:bg-dark-800/50 transition ${
                  selectedConv?.id === conv.id ? "bg-dark-800" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Kanal ikonu */}
                    <span className="shrink-0">{getChannelIcon(conv.channel)}</span>
                    <span className="text-sm font-medium text-white truncate">
                      {conv.contact_name || conv.contact_phone || t("unknown")}
                    </span>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-brand-500 text-dark-950 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-dark-400 truncate mt-1 ml-6">
                  {conv.last_message_preview || t("no_message")}
                </p>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  {conv.is_bot_active && (
                    <span className="text-[10px] bg-brand-500/10 text-brand-400 px-1.5 py-0.5 rounded">BOT</span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    conv.status === "open" ? "text-brand-400" :
                    conv.status === "resolved" ? "text-dark-500" : "text-yellow-400"
                  }`}>
                    {conv.status === "open" ? t("open") : conv.status === "resolved" ? t("resolved") : t("assigned")}
                  </span>
                  <span className="text-[10px] text-dark-600">
                    {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Sağ Panel — Mesajlar */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Kanal ikonu büyük */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  selectedConv.channel === "instagram" ? "bg-[#E1306C]/20" :
                  selectedConv.channel === "facebook" ? "bg-[#0084FF]/20" :
                  "bg-[#25D366]/20"
                }`}>
                  {getChannelIcon(selectedConv.channel)}
                </div>
                <div>
                  <h3 className="text-white font-medium text-[15px]">
                    {selectedConv.contact_name || selectedConv.contact_phone}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      selectedConv.channel === "instagram" ? "bg-[#E1306C]/10 text-[#E1306C]" :
                      selectedConv.channel === "facebook" ? "bg-[#0084FF]/10 text-[#0084FF]" :
                      "bg-[#25D366]/10 text-[#25D366]"
                    }`}>
                      {selectedConv.channel === "instagram" ? "Instagram" :
                       selectedConv.channel === "facebook" ? "Messenger" : "WhatsApp"}
                    </span>
                    <span className={`text-xs ${
                      selectedConv.status === "open" ? "text-brand-400" :
                      selectedConv.status === "resolved" ? "text-dark-500" : "text-yellow-400"
                    }`}>
                      {selectedConv.status === "open" ? t("open") :
                       selectedConv.status === "resolved" ? t("resolved") : t("assigned")}
                    </span>
                    {selectedConv.contact_phone && (
                      <span className="text-xs text-dark-500">{selectedConv.contact_phone}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => updateConversation({
                    status: selectedConv.status === "resolved" ? "open" : "resolved"
                  })}
                  className={`text-xs px-3 py-1.5 rounded-lg transition ${
                    selectedConv.status === "resolved"
                      ? "bg-brand-500/10 text-brand-400 hover:bg-brand-500/20"
                      : "bg-dark-800 text-dark-300 hover:text-white"
                  }`}
                >
                  {selectedConv.status === "resolved" ? t("reopen") : t("mark_resolved")}
                </button>
                <button
                  onClick={() => updateConversation({ is_bot_active: !selectedConv.is_bot_active })}
                  className={`text-xs px-3 py-1.5 rounded-lg transition ${
                    selectedConv.is_bot_active
                      ? "bg-brand-500/10 text-brand-400 hover:bg-brand-500/20"
                      : "bg-dark-800 text-dark-300 hover:text-white"
                  }`}
                >
                  {selectedConv.is_bot_active ? t("bot_off") : t("bot_on")}
                </button>
              </div>
            </div>

            {/* Mesajlar */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      msg.direction === "outbound"
                        ? msg.sender_type === "bot"
                          ? "bg-brand-500/10 border border-brand-500/20 text-brand-100"
                          : "bg-brand-600 text-dark-950"
                        : "bg-dark-800 text-white"
                    }`}
                  >
                    {msg.sender_type === "bot" && msg.direction === "outbound" && (
                      <span className="text-[10px] text-brand-400 block mb-1">{t("ai_bot")}</span>
                    )}
                    {msg.sender_type === "agent" && msg.direction === "outbound" && (
                      <span className="text-[10px] text-dark-950/60 block mb-1">{t("agent")}</span>
                    )}
                    <p className="text-[14px] whitespace-pre-wrap">{msg.content?.body}</p>
                    <div className={`flex items-center gap-1 mt-1 ${
                      msg.direction === "outbound" ? "justify-end" : ""
                    }`}>
                      <span className={`text-[10px] ${
                        msg.direction === "outbound" ? "opacity-60" : "text-dark-500"
                      }`}>
                        {formatTime(msg.created_at)}
                      </span>
                      {msg.direction === "outbound" && (
                        <span className={`text-[10px] ${
                          msg.status === "read" ? "text-blue-400" :
                          msg.status === "delivered" ? "text-dark-400" : "opacity-40"
                        }`}>
                          {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Mesaj input */}
            <div className="p-4 border-t border-dark-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  className="flex-1 bg-dark-800 border border-dark-700 rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition"
                  placeholder={t("write_message")}
                  disabled={sending}
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-6 py-2.5 rounded-xl transition disabled:opacity-50 text-[14px]"
                >
                  {sending ? (
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : t("send")}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-dark-600">
            <div className="text-center">
              <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-dark-400">{t("select_conversation")}</p>
              <p className="text-sm text-dark-600 mt-1">{t("select_conversation_desc")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
