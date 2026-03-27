"use client"

import { useEffect, useState, useRef } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

interface Conversation {
  id: string
  contact_name: string | null
  contact_phone: string | null
  status: string
  last_message_at: string | null
  last_message_preview: string | null
  unread_count: number
  is_bot_active: boolean
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

export default function InboxPage() {
  const { getToken } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState("")
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
      alert("Mesaj gonderilemedi: " + (err.message || "Bilinmeyen hata"))
    }
    setSending(false)
  }

  // Konuşma güncelle (çözüldü, bot aç/kapat)
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

  // Arama filtresi
  const filteredConversations = conversations.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (c.contact_name?.toLowerCase().includes(q)) ||
           (c.contact_phone?.toLowerCase().includes(q)) ||
           (c.last_message_preview?.toLowerCase().includes(q))
  })

  return (
    <div className="h-screen flex">
      {/* Sol Panel — Konuşma listesi */}
      <div className="w-80 border-r border-dark-800 flex flex-col">
        <div className="p-4 border-b border-dark-800">
          <h2 className="text-lg font-semibold text-white">Inbox</h2>
          <div className="mt-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-dark-500 text-sm">
              {search ? "Sonuç bulunamadı." : "Henüz konuşma yok."}
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
                  <span className="text-sm font-medium text-white truncate">
                    {conv.contact_name || conv.contact_phone || "Bilinmeyen"}
                  </span>
                  {conv.unread_count > 0 && (
                    <span className="bg-brand-500 text-dark-950 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-dark-400 truncate mt-1">
                  {conv.last_message_preview || "Mesaj yok"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {conv.is_bot_active && (
                    <span className="text-[10px] bg-brand-500/10 text-brand-400 px-1.5 py-0.5 rounded">BOT</span>
                  )}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    conv.status === "open" ? "text-brand-400" :
                    conv.status === "resolved" ? "text-dark-500" : "text-yellow-400"
                  }`}>
                    {conv.status === "open" ? "Acik" : conv.status === "resolved" ? "Cozuldu" : "Atandi"}
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

      {/* Sag Panel — Mesajlar */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium text-[15px]">
                  {selectedConv.contact_name || selectedConv.contact_phone}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs ${
                    selectedConv.status === "open" ? "text-brand-400" :
                    selectedConv.status === "resolved" ? "text-dark-500" : "text-yellow-400"
                  }`}>
                    {selectedConv.status === "open" ? "Acik" :
                     selectedConv.status === "resolved" ? "Cozuldu" : "Atandi"}
                  </span>
                  {selectedConv.contact_phone && (
                    <span className="text-xs text-dark-500">{selectedConv.contact_phone}</span>
                  )}
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
                  {selectedConv.status === "resolved" ? "Yeniden Ac" : "Cozuldu"}
                </button>
                <button
                  onClick={() => updateConversation({ is_bot_active: !selectedConv.is_bot_active })}
                  className={`text-xs px-3 py-1.5 rounded-lg transition ${
                    selectedConv.is_bot_active
                      ? "bg-brand-500/10 text-brand-400 hover:bg-brand-500/20"
                      : "bg-dark-800 text-dark-300 hover:text-white"
                  }`}
                >
                  Bot {selectedConv.is_bot_active ? "Kapat" : "Ac"}
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
                      <span className="text-[10px] text-brand-400 block mb-1">AI Bot</span>
                    )}
                    {msg.sender_type === "agent" && msg.direction === "outbound" && (
                      <span className="text-[10px] text-dark-950/60 block mb-1">Agent</span>
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
                  placeholder="Mesaj yaz..."
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
                  ) : "Gonder"}
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
              <p className="text-lg font-medium text-dark-400">Bir konusma secin</p>
              <p className="text-sm text-dark-600 mt-1">Soldan bir konusma secip mesajlari gorun</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
