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
  if (!name) return "bg-surface-300"
  const colors = [
    "bg-emerald-500", "bg-blue-500", "bg-violet-500", "bg-pink-500",
    "bg-amber-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
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
      <section className="w-[340px] flex flex-col border-r border-surface-200 bg-white shrink-0">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-page-title mb-4">{t("inbox")}</h2>
          {/* Channel Filters */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3">
            {CHANNEL_FILTERS.map((ch) => {
              const isActive = activeChannel === ch.id
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch.id)}
                  className={`px-3 py-1.5 rounded-btn text-micro font-bold whitespace-nowrap flex items-center gap-1.5 transition-all duration-150 ${
                    isActive
                      ? "bg-primary text-white shadow-button-primary"
                      : "bg-surface-100 text-surface-500 hover:bg-surface-200"
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
        <div className="flex-1 overflow-y-auto no-scrollbar px-2.5 space-y-0.5 pb-6">
          {filteredConversations.length === 0 ? (
            <div className="ds-empty-state">
              <div className="ds-empty-state-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-surface-300">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <p className="ds-empty-state-title">{search ? t("no_results") : t("no_conversations")}</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedConv?.id === conv.id
              const channelColor = getChannelColor(conv.channel)
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`w-full p-3 rounded-card-sm text-left transition-all duration-150 relative group ${
                    isSelected
                      ? "bg-primary/5 border border-primary/15 shadow-card"
                      : "hover:bg-surface-50 border border-transparent"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-avatar ${getAvatarColor(conv.contact_name)} flex items-center justify-center text-white text-micro font-bold`}>
                        {getInitials(conv.contact_name)}
                      </div>
                      {/* Channel badge */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] bg-white rounded-md flex items-center justify-center ring-1 ring-surface-100">
                        <span style={{ color: channelColor }} className="flex items-center justify-center [&>svg]:w-2.5 [&>svg]:h-2.5">
                          {conv.channel === "instagram" ? CHANNEL_FILTERS[2].icon :
                           conv.channel === "facebook" ? CHANNEL_FILTERS[3].icon :
                           CHANNEL_FILTERS[1].icon}
                        </span>
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <h3 className={`text-ui truncate ${isSelected ? "text-primary font-bold" : "font-bold text-ink"}`}>
                          {conv.contact_name || conv.contact_phone || t("unknown")}
                        </h3>
                        <span className={`text-micro shrink-0 ml-2 ${conv.unread_count > 0 ? "font-bold text-primary" : "text-surface-400"}`}>
                          {conv.last_message_at ? formatTime(conv.last_message_at) : ""}
                        </span>
                      </div>
                      <p className="text-caption text-surface-400 line-clamp-1">
                        {conv.last_message_preview || t("no_message")}
                      </p>
                    </div>
                  </div>
                  {/* Unread indicator */}
                  {conv.unread_count > 0 && (
                    <div className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full ring-2 ring-white" />
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
            <div className="px-6 py-3.5 flex justify-between items-center border-b border-surface-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-avatar ${getAvatarColor(selectedConv.contact_name)} flex items-center justify-center text-white text-micro font-bold`}>
                    {getInitials(selectedConv.contact_name)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-primary border-2 border-white rounded-full" />
                </div>
                <div>
                  <h3 className="font-bold text-body-medium text-ink">
                    {selectedConv.contact_name || selectedConv.contact_phone}
                  </h3>
                  <p className="text-micro text-primary flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-primary rounded-full" />
                    {t("online")} &bull; {getChannelLabel(selectedConv.channel)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Call */}
                <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-100 rounded-[6px] transition-colors text-surface-400 hover:text-ink-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                </button>
                {/* Video */}
                <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-100 rounded-[6px] transition-colors text-surface-400 hover:text-ink-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                </button>
                {/* Info */}
                <button className="w-8 h-8 flex items-center justify-center hover:bg-surface-100 rounded-[6px] transition-colors text-surface-400 hover:text-ink-secondary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-[18px] h-[18px]">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 no-scrollbar bg-surface-50/50">
              {messageGroups.map((group, gi) => (
                <div key={gi} className="space-y-3">
                  {/* Date separator */}
                  <div className="flex justify-center">
                    <span className="px-3 py-1 bg-white text-surface-400 text-micro font-bold rounded-badge border border-surface-200">
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
                        className={`flex ${isOutbound ? "flex-row-reverse" : ""} gap-2.5 max-w-[70%] ${isOutbound ? "ml-auto" : ""}`}
                      >
                        {/* Avatar for incoming */}
                        {!isOutbound && isFirstInGroup && (
                          <div className="shrink-0 mt-auto mb-1">
                            <div className={`w-7 h-7 rounded-avatar ${getAvatarColor(selectedConv.contact_name)} flex items-center justify-center text-white text-[10px] font-bold`}>
                              {getInitials(selectedConv.contact_name)}
                            </div>
                          </div>
                        )}
                        {!isOutbound && !isFirstInGroup && <div className="w-7 shrink-0" />}

                        <div
                          className={`px-4 py-2.5 text-ui leading-relaxed ${
                            isOutbound
                              ? isBot
                                ? "bg-primary/10 border border-primary/20 text-ink rounded-[6px] rounded-br-sm"
                                : "bg-primary text-white rounded-[6px] rounded-br-sm"
                              : "bg-white text-ink rounded-[6px] rounded-bl-sm shadow-card border border-surface-300"
                          }`}
                        >
                          {isBot && isOutbound && (
                            <span className="ds-badge-ai text-[9px] px-1.5 py-px mb-1.5 inline-flex">{t("ai_bot")}</span>
                          )}
                          {msg.sender_type === "agent" && isOutbound && (
                            <span className="text-[10px] text-white/70 block mb-1">{t("agent")}</span>
                          )}
                          <p className="whitespace-pre-wrap">{msg.content?.body}</p>
                          <div className={`flex items-center gap-1 mt-1.5 ${isOutbound ? "justify-end" : ""}`}>
                            <span className={`text-[10px] font-medium ${
                              isOutbound
                                ? isBot ? "text-primary/50" : "text-white/70"
                                : "text-ink-muted"
                            }`}>
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {isOutbound && (
                              <>
                                {msg.status === "read" && (
                                  <span className={`text-[10px] ${isBot ? "text-primary/50" : "text-white/70"}`}> &bull; {t("read")}</span>
                                )}
                                {msg.status === "delivered" && (
                                  <span className={`text-[10px] ${isBot ? "text-primary/40" : "text-white/60"}`}>
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
                  <div className="ds-ai-surface ds-ai-glow px-4 py-2 rounded-btn flex items-center gap-2">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary">
                      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                    </svg>
                    <span className="text-micro font-bold text-primary">{t("ai_suggestions_ready")}</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* AI Suggestions & Input Area */}
            <div className="px-5 py-4 border-t border-surface-200 bg-white">
              {/* AI Suggestion Chips */}
              {messages.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setNewMessage(t("yes") + ", " + t("send").toLowerCase() + ".")}
                    className="shrink-0 ds-btn-sm ds-badge-ai px-3 py-1.5 rounded-btn hover:bg-primary/15 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                    </svg>
                    AI {t("send")}
                  </button>
                  <button
                    onClick={() => updateConversation({ status: selectedConv.status === "resolved" ? "open" : "resolved" })}
                    className="shrink-0 ds-btn-secondary ds-btn-sm"
                  >
                    {selectedConv.status === "resolved" ? t("reopen") : t("mark_resolved")}
                  </button>
                  <button
                    onClick={() => updateConversation({ is_bot_active: !selectedConv.is_bot_active })}
                    className="shrink-0 ds-btn-secondary ds-btn-sm"
                  >
                    {selectedConv.is_bot_active ? t("bot_off") : t("bot_on")}
                  </button>
                </div>
              )}

              {/* Message Input */}
              <div className="flex items-end gap-2 bg-surface-50 p-2 rounded-[6px] border border-surface-200 focus-within:border-primary/30 focus-within:bg-white focus-within:shadow-input-focus transition-all duration-200">
                <button className="w-8 h-8 flex items-center justify-center text-surface-400 hover:text-primary rounded-[6px] hover:bg-surface-100 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-[18px] h-[18px]">
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
                  className="flex-1 bg-transparent border-none focus:ring-0 text-ui py-2 min-h-[36px] max-h-32 no-scrollbar resize-none placeholder-surface-400 focus:outline-none"
                  placeholder={t("write_message")}
                  disabled={sending}
                  rows={1}
                />
                <div className="flex items-center gap-1 mb-0.5 pr-0.5">
                  <button className="w-8 h-8 flex items-center justify-center text-surface-400 hover:text-primary rounded-[6px] hover:bg-surface-100 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-[18px] h-[18px]">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending || !newMessage.trim()}
                    className="w-9 h-9 bg-primary text-white rounded-[6px] shadow-button-primary active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 flex items-center justify-center"
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
          <div className="flex-1 flex items-center justify-center bg-surface-50/30">
            <div className="text-center">
              <div className="ds-empty-state-icon mx-auto">
                <svg className="w-7 h-7 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="ds-empty-state-title">{t("select_conversation")}</p>
              <p className="ds-empty-state-desc mt-1">{t("select_conversation_desc")}</p>
            </div>
          </div>
        )}
      </section>

      {/* ===== RIGHT PANEL - Contact Info / AI Insights ===== */}
      {selectedConv && (
        <aside className="hidden xl:flex w-[300px] flex-col border-l border-surface-200 bg-white p-5 overflow-y-auto no-scrollbar shrink-0">
          {/* Profile */}
          <div className="text-center mb-6 pt-2">
            <div className={`w-16 h-16 rounded-avatar mx-auto ${getAvatarColor(selectedConv.contact_name)} flex items-center justify-center text-white text-xl font-bold mb-3 ring-4 ring-white`}>
              {getInitials(selectedConv.contact_name)}
            </div>
            <h2 className="font-bold text-body-medium text-ink">{selectedConv.contact_name || t("unknown")}</h2>
            <p className="text-micro text-surface-400 mt-0.5">
              {t("individual_customer")} {selectedConv.contact_phone ? `\u2022 ${selectedConv.contact_phone}` : ""}
            </p>
          </div>

          <div className="space-y-5">
            {/* AI Insights Card */}
            <div className="ds-ai-surface p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-primary">
                  <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                </svg>
                <h3 className="text-section-label uppercase tracking-wider text-primary">{t("ai_summary_title")}</h3>
              </div>
              <p className="text-caption text-surface-600 leading-relaxed">
                {selectedConv.contact_name || t("unknown")} - {getChannelLabel(selectedConv.channel)} {t("online").toLowerCase()}.
                {selectedConv.is_bot_active && ` ${t("ai_bot")} ${t("active").toLowerCase()}.`}
              </p>
              <div className="mt-3 flex gap-1.5 flex-wrap">
                <span className="ds-badge-primary text-[9px]">
                  {getChannelLabel(selectedConv.channel)}
                </span>
                <span className={`ds-badge text-[9px] ${
                  selectedConv.status === "open" ? "bg-emerald-50 text-emerald-600" :
                  selectedConv.status === "resolved" ? "bg-surface-100 text-surface-500" : "bg-amber-50 text-amber-600"
                }`}>
                  {selectedConv.status === "open" ? t("open") :
                   selectedConv.status === "resolved" ? t("resolved") : t("assigned")}
                </span>
              </div>
            </div>

            {/* Customer Details */}
            <div>
              <h3 className="text-section-label uppercase tracking-wider text-surface-400 mb-3">{t("customer_details")}</h3>
              <div className="space-y-2.5">
                {selectedConv.contact_email && (
                  <div className="flex items-center gap-2.5 p-2 rounded-card-sm hover:bg-surface-50 transition-colors">
                    <div className="w-8 h-8 rounded-[6px] bg-surface-100 flex items-center justify-center text-surface-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M22 7l-10 6L2 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-micro text-surface-400">{t("email_label")}</p>
                      <p className="text-ui text-ink">{selectedConv.contact_email}</p>
                    </div>
                  </div>
                )}
                {selectedConv.contact_phone && (
                  <div className="flex items-center gap-2.5 p-2 rounded-card-sm hover:bg-surface-50 transition-colors">
                    <div className="w-8 h-8 rounded-[6px] bg-surface-100 flex items-center justify-center text-surface-400">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
                        <rect x="5" y="2" width="14" height="20" rx="2" />
                        <line x1="12" y1="18" x2="12.01" y2="18" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-micro text-surface-400">{t("phone_label")}</p>
                      <p className="text-ui text-ink">{selectedConv.contact_phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-section-label uppercase tracking-wider text-surface-400">{t("tags_label")}</h3>
                <button className="text-micro font-bold text-primary hover:text-primary-600 transition-colors">{t("add_tag_btn")}</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedConv.is_bot_active && (
                  <span className="ds-badge-ai">AI Bot</span>
                )}
                <span className="ds-badge bg-blue-50 text-blue-600">
                  {getChannelLabel(selectedConv.channel)}
                </span>
                <span className={`ds-badge ${
                  selectedConv.status === "open" ? "bg-emerald-50 text-emerald-600" :
                  selectedConv.status === "resolved" ? "bg-surface-100 text-surface-500" :
                  "bg-amber-50 text-amber-600"
                }`}>
                  {selectedConv.status === "open" ? t("open") :
                   selectedConv.status === "resolved" ? t("resolved") : t("assigned")}
                </span>
                {(selectedConv.tags || []).map((tag, i) => (
                  <span key={i} className="ds-badge-neutral">{tag}</span>
                ))}
              </div>
            </div>

            {/* Archive Button */}
            <button
              onClick={() => updateConversation({ status: "resolved" })}
              className="w-full py-2.5 bg-red-50 text-red-500 rounded-btn text-micro font-bold hover:bg-red-100 transition-colors border border-red-100"
            >
              {t("archive_conversation")}
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}
