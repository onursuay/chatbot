"use client"

import { useEffect, useState, useRef, useCallback } from "react"
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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api<Conversation[]>("/conversations", { token }).then(setConversations).catch(() => {})
  }, [getToken])

  useEffect(() => {
    if (!selectedConv) return
    const token = getToken()
    if (!token) return
    api<Message[]>(`/conversations/${selectedConv.id}/messages`, { token })
      .then(setMessages)
      .catch(() => {})
  }, [selectedConv, getToken])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Supabase Realtime — yeni mesajları dinle
  useEffect(() => {
    if (!selectedConv) return

    const channel = supabase
      .channel(`messages:${selectedConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConv.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedConv])

  // Supabase Realtime — conversation güncellemelerini dinle
  useEffect(() => {
    const channel = supabase
      .channel("conversations-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          // Conversation listesini yenile
          const token = getToken()
          if (token) {
            api<Conversation[]>("/conversations", { token })
              .then(setConversations)
              .catch(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [getToken])

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedConv) return
    const token = getToken()
    if (!token) return

    setSending(true)
    try {
      const msg = await api<Message>(`/conversations/${selectedConv.id}/messages`, {
        method: "POST",
        token,
        body: JSON.stringify({ text: newMessage }),
      })
      setMessages((prev) => [...prev, msg])
      setNewMessage("")
    } catch {}
    setSending(false)
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="h-screen flex">
      {/* Sol Panel */}
      <div className="w-80 border-r border-dark-800 flex flex-col">
        <div className="p-4 border-b border-dark-800">
          <h2 className="text-lg font-semibold text-white">Inbox</h2>
          <div className="mt-2">
            <input
              type="text"
              placeholder="Ara..."
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-dark-500 text-sm">
              Henüz konuşma yok.<br/>WhatsApp numaranızı bağlayıp mesaj bekleyin.
            </div>
          ) : (
            conversations.map((conv) => (
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
                  <span className="text-[10px] text-dark-600">
                    {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Sağ Panel */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            <div className="p-4 border-b border-dark-800 flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium text-[15px]">
                  {selectedConv.contact_name || selectedConv.contact_phone}
                </h3>
                <span className={`text-xs ${
                  selectedConv.status === "open" ? "text-brand-400" :
                  selectedConv.status === "resolved" ? "text-dark-500" : "text-yellow-400"
                }`}>
                  {selectedConv.status === "open" ? "Açık" :
                   selectedConv.status === "resolved" ? "Çözüldü" : "Atandı"}
                </span>
              </div>
              <div className="flex gap-2">
                <button className="text-xs bg-dark-800 text-dark-300 hover:text-white px-3 py-1.5 rounded-lg transition">
                  Çözüldü
                </button>
                <button className="text-xs bg-dark-800 text-dark-300 hover:text-white px-3 py-1.5 rounded-lg transition">
                  Bot {selectedConv.is_bot_active ? "Kapat" : "Aç"}
                </button>
              </div>
            </div>

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
                    <p className="text-[14px]">{msg.content.body}</p>
                    <span className={`text-[10px] block mt-1 ${
                      msg.direction === "outbound" ? "text-right opacity-60" : "text-dark-500"
                    }`}>
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-dark-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1 bg-dark-800 border border-dark-700 rounded-xl px-4 py-2.5 text-[14px] text-white placeholder-dark-500 focus:outline-none focus:border-brand-500 transition"
                  placeholder="Mesaj yaz..."
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newMessage.trim()}
                  className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-6 py-2.5 rounded-xl transition disabled:opacity-50 text-[14px]"
                >
                  {sending ? "..." : "Gönder"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-dark-600">
            <div className="text-center">
              <div className="text-5xl mb-4">💬</div>
              <p className="text-lg">Bir konuşma seçin</p>
              <p className="text-sm text-dark-700 mt-1">Soldan bir konuşma seçip mesajları görün</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
