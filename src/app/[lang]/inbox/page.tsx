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
  contact_email?: string | null
  status: string
  last_message_at: string | null
  last_message_preview: string | null
  unread_count: number
  is_bot_active: boolean
  channel?: string
  tags?: string[]
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

// Channel filter config
const CHANNEL_FILTERS: { id: Channel; labelKey: string; icon: JSX.Element }[] = [
  {
    id: "all",
    labelKey: "all",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
  {
    id: "whatsapp",
    labelKey: "WhatsApp",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  },
  {
    id: "instagram",
    labelKey: "Instagram",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="18" cy="6" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "facebook",
    labelKey: "Messenger",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.17 7.18V22l2.93-1.63c.83.23 1.71.36 2.63.36h.27c5.64 0 10-4.13 10-9.7C21 6.13 17.64 2 12 2zm.97 13.04l-2.55-2.73L5.4 15.3l5.04-5.36 2.62 2.73 4.94-2.98-5.03 5.35z" />
      </svg>
    ),
  },
]

function getChannelColor(channel?: string) {
  if (channel === "instagram") return "#E1306C"
  if (channel === "facebook") return "#0084FF"
  return "#25D366"
}

function getChannelLabel(channel?: string) {
  if (channel === "instagram") return "Instagram"
  if (channel === "facebook") return "Messenger"
  return "WhatsApp"
}

function getInitials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

// Generate a consistent color from name
function getAvatarColor(name?: string | null) {
  if (!name) return "bg-gray-300"
  const colors = [
    "bg-emerald-400", "bg-blue-400", "bg-purple-400", "bg-pink-400",
    "bg-amber-400", "bg-teal-400", "bg-indigo-400", "bg-rose-400",
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
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

  // Load conversations
  const loadConversations = () => {
    const token = getToken()
    if (!token) return
    api<Conversation[]>("/conversations", { token }).then(setConversations).catch(() => {})
  }

  useEffect(() => {
    loadConversations()
  }, [getToken])

  // Load messages
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

  // Supabase Realtime - new messages
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

  // Supabase Realtime - conversation updates
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

  // Send message
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

  // Update conversation
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
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return t("yesterday")
    return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })
  }

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  }

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { label: string; messages: Message[] }[] = []
    let currentLabel = ""
    const now = new Date()

    for (const msg of msgs) {
      const d = new Date(msg.created_at)
      let label: string
      if (d.toDateString() === now.toDateString()) {
        label = t("today")
      } else {
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        if (d.toDateString() === yesterday.toDateString()) {
          label = t("yesterday")
        } else {
          label = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })
        }
      }
      if (label !== currentLabel) {
        currentLabel = label
        groups.push({ label, messages: [msg] })
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    }
    return groups
  }

  // Search + channel filter
  const filteredConversations = conversations.filter((c) => {
    if (activeChannel !== "all") {
      const convChannel = c.channel || "whatsapp"
      if (convChannel !== activeChannel) return false
    }
    if (!search) return true
    const q = search.toLowerCase()
    return (c.contact_name?.toLowerCase().includes(q)) ||
           (c.contact_phone?.toLowerCase().includes(q)) ||
           (c.last_message_preview?.toLowerCase().includes(q))
  })

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="h-full flex overflow-hidden">
      {/* ===== LEFT PANEL - Inbox List ===== */}
      <section className="w-[340px] flex flex-col border-r border-gray-100 bg-white/50 shrink-0">
        <div className="p-5 pb-3">
          <h2 className="text-xl font-bold tracking-tight mb-4">{t("inbox")}</h2>
          {/* Channel Filters */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
            {CHANNEL_FILTERS.map((ch) => {
              const isActive = activeChannel === ch.id
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-primary text-white shadow-md shadow-primary/20"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {ch.id !== "all" && <span className={isActive ? "text-white" : ch.id === "whatsapp" ? "text-[#25D366]" : ch.id === "instagram" ? "text-[#E1306C]" : "text-[#0084FF]"}>{ch.icon}</span>}
                  {ch.id === "all" ? t("all") : ch.labelKey}
                </button>
              )
            })}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-3 space-y-1.5 pb-6">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              {search ? t("no_results") : t("no_conversations")}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConv?.id === conv.id
              const channelColor = getChannelColor(conv.channel)
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full p-3.5 rounded-xl text-left transition-all relative group ${
                    isSelected
                      ? "bg-white border border-primary/10 shadow-sm"
                      : "hover:bg-white/80"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 rounded-full ${getAvatarColor(conv.contact_name)} flex items-center justify-center text-white text-sm font-bold`}>
                        {getInitials(conv.contact_name)}
                      </div>
                      {/* Channel badge */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <span style={{ color: channelColor }} className="flex items-center justify-center">
                          {conv.channel === "instagram" ? CHANNEL_FILTERS[2].icon :
                           conv.channel === "facebook" ? CHANNEL_FILTERS[3].icon :
                           CHANNEL_FILTERS[1].icon}
                        </span>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <h3 className="font-semibold text-[13px] text-gray-900 truncate">
                          {conv.contact_name || conv.contact_phone || t("unknown")}
                        </h3>
                        <span className={`text-[10px] shrink-0 ml-2 ${conv.unread_count > 0 ? "font-bold text-primary" : "text-gray-400"}`}>
                          {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-400 line-clamp-1">
                        {conv.last_message_preview || t("no_message")}
                      </p>
                    </div>
                  </div>
                  {/* Unread indicator */}
                  {conv.unread_count > 0 && (
                    <div className="absolute top-3.5 right-3.5 w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </section>

      {/* ===== CENTER PANEL - Active Chat ===== */}
      <section className="flex-1 flex flex-col bg-white min-w-0">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(selectedConv.contact_name)} flex items-center justify-center text-white text-sm font-bold`}>
                    {getInitials(selectedConv.contact_name)}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-primary border-2 border-white rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-[15px]">
                    {selectedConv.contact_name || selectedConv.contact_phone}
                  </h3>
                  <p className="text-[10px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    {t("online")} &bull; {getChannelLabel(selectedConv.channel)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Call */}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </button>
                {/* Video */}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                </button>
                {/* Info */}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
              {messageGroups.map((group, gi) => (
                <div key={gi} className="space-y-4">
                  {/* Date separator */}
                  <div className="flex justify-center">
                    <span className="px-3 py-1 bg-gray-100/80 text-gray-400 text-[10px] font-bold rounded-full uppercase tracking-widest">
                      {group.label}
                    </span>
                  </div>

                  {group.messages.map((msg, mi) => {
                    const isOutbound = msg.direction === "outbound"
                    const isBot = msg.sender_type === "bot"
                    const isFirstInGroup = mi === 0 || group.messages[mi - 1].direction !== msg.direction

                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOutbound ? "flex-row-reverse" : ""} gap-3 max-w-[70%] ${isOutbound ? "ml-auto" : ""}`}
                      >
                        {/* Avatar for incoming */}
                        {!isOutbound && isFirstInGroup && (
                          <div className="shrink-0 mt-auto mb-1">
                            <div className={`w-7 h-7 rounded-full ${getAvatarColor(selectedConv.contact_name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                              {getInitials(selectedConv.contact_name)}
                            </div>
                          </div>
                        )}
                        {!isOutbound && !isFirstInGroup && <div className="w-7 shrink-0" />}

                        <div
                          className={`px-4 py-2.5 text-[13px] leading-relaxed ${
                            isOutbound
                              ? isBot
                                ? "bg-primary/10 border border-primary/20 text-gray-800 rounded-2xl rounded-br-none"
                                : "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-none shadow-lg shadow-blue-500/20"
                              : "bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none shadow-sm"
                          }`}
                        >
                          {isBot && isOutbound && (
                            <span className="text-[10px] text-primary font-medium block mb-1">{t("ai_bot")}</span>
                          )}
                          {msg.sender_type === "agent" && isOutbound && (
                            <span className="text-[10px] text-white/60 block mb-1">{t("agent")}</span>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content?.body}</p>
                          <div className={`flex items-center gap-1 mt-1.5 ${isOutbound ? "justify-end" : ""}`}>
                            <span className={`text-[10px] font-medium ${
                              isOutbound
                                ? isBot ? "text-primary/60" : "text-white/60"
                                : "text-gray-400"
                            }`}>
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {isOutbound && (
                              <>
                                {msg.status === "read" && (
                                  <span className="text-[10px] text-white/70"> &bull; {t("read")}</span>
                                )}
                                {msg.status === "delivered" && (
                                  <span className={`text-[10px] ${isBot ? "text-primary/50" : "text-white/50"}`}>
                                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 inline"><path d="M2 8l3 3 7-7" stroke="currentColor" strokeWidth={2} fill="none" /><path d="M6 8l3 3 7-7" stroke="currentColor" strokeWidth={2} fill="none" /></svg>
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* AI Context Tip */}
              {messages.length > 0 && (
                <div className="flex justify-center py-2">
                  <div className="glass-effect px-4 py-2 rounded-xl border border-primary/20 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary">
                      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                    </svg>
                    <span className="text-[12px] font-medium text-primary">{t("ai_suggestions_ready")}</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* AI Suggestions & Input Area */}
            <div className="p-5 border-t border-gray-100 glass-effect">
              {/* AI Suggestion Chips */}
              {messages.length > 0 && (
                <div className="flex gap-2.5 mb-4 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setNewMessage(t("yes") + ", " + t("send").toLowerCase() + ".")}
                    className="shrink-0 px-3.5 py-2 bg-primary/10 text-primary text-[11px] font-bold rounded-lg border border-primary/20 hover:bg-primary/20 transition-colors flex items-center gap-1.5"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                    </svg>
                    AI {t("send")}
                  </button>
                  <button
                    onClick={() => updateConversation({ status: selectedConv.status === "resolved" ? "open" : "resolved" })}
                    className="shrink-0 px-3.5 py-2 bg-white text-gray-500 text-[11px] font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {selectedConv.status === "resolved" ? t("reopen") : t("mark_resolved")}
                  </button>
                  <button
                    onClick={() => updateConversation({ is_bot_active: !selectedConv.is_bot_active })}
                    className="shrink-0 px-3.5 py-2 bg-white text-gray-500 text-[11px] font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {selectedConv.is_bot_active ? t("bot_off") : t("bot_on")}
                  </button>
                </div>
              )}

              {/* Message Input */}
              <div className="flex items-end gap-3 bg-gray-50 p-2 rounded-2xl focus-within:bg-white focus-within:shadow-xl transition-all duration-300">
                <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-[13px] py-2.5 min-h-[40px] max-h-32 no-scrollbar resize-none placeholder-gray-400"
                  placeholder={t("write_message")}
                  disabled={sending}
                  rows={1}
                />
                <div className="flex items-center gap-1 mb-0.5 pr-1">
                  <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="p-2.5 bg-primary text-white rounded-xl shadow-md active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center"
                  >
                    {sending ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-base font-medium text-gray-400">{t("select_conversation")}</p>
              <p className="text-[12px] text-gray-300 mt-1">{t("select_conversation_desc")}</p>
            </div>
          </div>
        )}
      </section>

      {/* ===== RIGHT PANEL - Contact Info / AI Insights ===== */}
      {selectedConv && (
        <aside className="hidden xl:flex w-[300px] flex-col border-l border-gray-100 bg-gray-50/50 p-6 overflow-y-auto no-scrollbar shrink-0">
          {/* Profile */}
          <div className="text-center mb-6">
            <div className={`w-20 h-20 rounded-2xl mx-auto ${getAvatarColor(selectedConv.contact_name)} flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-xl ring-4 ring-white`}>
              {getInitials(selectedConv.contact_name)}
            </div>
            <h2 className="font-bold text-lg">{selectedConv.contact_name || t("unknown")}</h2>
            <p className="text-[11px] text-gray-400 font-medium">
              {t("individual_customer")} {selectedConv.contact_phone ? `\u2022 ${selectedConv.contact_phone}` : ""}
            </p>
          </div>

          <div className="space-y-6">
            {/* AI Insights Card */}
            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary">
                  <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                </svg>
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-primary">{t("ai_summary_title")}</h3>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                {selectedConv.contact_name || t("unknown")} - {getChannelLabel(selectedConv.channel)} {t("online").toLowerCase()}.
                {selectedConv.is_bot_active && ` ${t("ai_bot")} ${t("active").toLowerCase()}.`}
              </p>
              <div className="mt-3 flex gap-1.5 flex-wrap">
                <span className="px-2 py-0.5 bg-white/60 rounded-md text-[9px] font-bold text-primary uppercase">
                  {getChannelLabel(selectedConv.channel)}
                </span>
                <span className={`px-2 py-0.5 bg-white/60 rounded-md text-[9px] font-bold uppercase ${
                  selectedConv.status === "open" ? "text-primary" :
                  selectedConv.status === "resolved" ? "text-gray-400" : "text-amber-500"
                }`}>
                  {selectedConv.status === "open" ? t("open") :
                   selectedConv.status === "resolved" ? t("resolved") : t("assigned")}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">{t("customer_details")}</h3>
              <div className="space-y-3">
                {selectedConv.contact_email && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M22 7l-10 6L2 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">{t("email_label")}</p>
                      <p className="text-[11px] font-medium">{selectedConv.contact_email}</p>
                    </div>
                  </div>
                )}
                {selectedConv.contact_phone && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5">
                        <rect x="5" y="2" width="14" height="20" rx="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[9px] text-gray-400 font-bold">{t("phone_label")}</p>
                      <p className="text-[11px] font-medium">{selectedConv.contact_phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">{t("tags_label")}</h3>
                <button className="text-[10px] font-bold text-primary">{t("add_tag_btn")}</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedConv.is_bot_active && (
                  <span className="px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full">AI Bot</span>
                )}
                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-full">
                  {getChannelLabel(selectedConv.channel)}
                </span>
                <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                  selectedConv.status === "open" ? "bg-emerald-50 text-emerald-600" :
                  selectedConv.status === "resolved" ? "bg-gray-100 text-gray-500" :
                  "bg-amber-50 text-amber-600"
                }`}>
                  {selectedConv.status === "open" ? t("open") :
                   selectedConv.status === "resolved" ? t("resolved") : t("assigned")}
                </span>
                {(selectedConv.tags || []).map((tag, i) => (
                  <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full">{tag}</span>
                ))}
              </div>
            </div>

            {/* Archive Button */}
            <button
              onClick={() => updateConversation({ status: "resolved" })}
              className="w-full py-2.5 bg-red-50 text-red-500 rounded-xl text-[11px] font-bold hover:bg-red-100 transition-colors mt-2"
            >
              {t("archive_conversation")}
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}
