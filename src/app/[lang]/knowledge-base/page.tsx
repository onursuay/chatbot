"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface KBItem {
  id: string
  title: string
  type: "text" | "url" | "faq"
  category: string | null
  content: string
  url?: string
  created_at: string
}

export default function KnowledgeBasePage() {
  const { getToken } = useAuth()
  const { t, lang } = useI18n()
  const isTR = lang === "tr"

  const [items, setItems] = useState<KBItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"text" | "url" | "file" | "faq">("text")

  // Form states
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [url, setUrl] = useState("")
  const [category, setCategory] = useState("other")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [saving, setSaving] = useState(false)
  const [urlFetching, setUrlFetching] = useState(false)
  const [fileReading, setFileReading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 4000)
  }

  // Filter
  const [filterType, setFilterType] = useState<"all" | "text" | "url" | "faq">("all")
  const [searchQuery, setSearchQuery] = useState("")

  const KB_CATEGORIES = [
    { value: "products", label: isTR ? "Urunler" : "Products" },
    { value: "services", label: isTR ? "Hizmetler" : "Services" },
    { value: "pricing", label: isTR ? "Fiyatlar" : "Prices" },
    { value: "company", label: isTR ? "Sirket Bilgisi" : "Company Info" },
    { value: "faq", label: isTR ? "SSS" : "FAQ" },
    { value: "other", label: isTR ? "Diger" : "Other" },
  ]

  const loadItems = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const data = await api<KBItem[]>("/knowledge-base", { token })
      setItems(data)
    } catch {
      setItems([])
    }
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const resetForm = () => {
    setTitle("")
    setContent("")
    setUrl("")
    setCategory("other")
    setQuestion("")
    setAnswer("")
    setFileName("")
    if (fileRef.current) fileRef.current.value = ""
  }

  // Save text/url/faq entry
  const handleSave = async () => {
    const token = getToken()
    if (!token) return
    setSaving(true)

    let body: Record<string, any> = {}

    if (activeTab === "text" || activeTab === "file") {
      if (!title.trim() || !content.trim()) {
        showToast("error", isTR ? "Baslik ve icerik zorunlu" : "Title and content are required")
        setSaving(false)
        return
      }
      body = { title, type: "text", category, content }
    } else if (activeTab === "url") {
      if (!title.trim() || !content.trim()) {
        showToast("error", isTR ? "Baslik ve icerik zorunlu" : "Title and content are required")
        setSaving(false)
        return
      }
      body = { title, type: "url", category, content, url }
    } else if (activeTab === "faq") {
      if (!question.trim() || !answer.trim()) {
        showToast("error", isTR ? "Soru ve cevap zorunlu" : "Question and answer are required")
        setSaving(false)
        return
      }
      body = {
        title: question,
        type: "faq",
        category: "faq",
        content: `S: ${question}\nC: ${answer}`,
      }
    }

    try {
      await api("/knowledge-base", {
        method: "POST",
        token,
        body: JSON.stringify(body),
      })
      showToast("success", t("kb_saved_success"))
      resetForm()
      loadItems()
    } catch (err: any) {
      showToast("error", err.message || (isTR ? "Kaydedilemedi" : "Failed to save"))
    }
    setSaving(false)
  }

  // Fetch URL content
  const handleFetchUrl = async () => {
    const token = getToken()
    if (!token || !url.trim()) return
    setUrlFetching(true)
    try {
      const res = await api<{ content: string; title?: string }>("/knowledge-base/fetch-url", {
        method: "POST",
        token,
        body: JSON.stringify({ url }),
      })
      setContent(res.content || "")
      if (res.title && !title.trim()) setTitle(res.title)
      showToast("success", isTR ? "Icerik basariyla cekildi" : "Content fetched successfully")
    } catch (err: any) {
      showToast("error", err.message || (isTR ? "Icerik cekilemedi" : "Failed to fetch content"))
    }
    setUrlFetching(false)
  }

  // Handle file upload (client-side text extraction)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (35MB)
    if (file.size > 35 * 1024 * 1024) {
      showToast("error", t("kb_file_too_large"))
      if (fileRef.current) fileRef.current.value = ""
      return
    }

    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!["pdf", "txt", "docx"].includes(ext || "")) {
      showToast("error", t("kb_unsupported_file"))
      if (fileRef.current) fileRef.current.value = ""
      return
    }

    setFileReading(true)
    setFileName(file.name)
    if (!title.trim()) setTitle(file.name.replace(/\.[^/.]+$/, ""))

    try {
      if (ext === "txt") {
        const text = await file.text()
        setContent(text.substring(0, 10000))
      } else if (ext === "pdf") {
        // Read PDF as base64, extract text via basic method
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        let text = ""
        // Simple PDF text extraction - extract text between stream markers
        const decoder = new TextDecoder("utf-8", { fatal: false })
        const raw = decoder.decode(bytes)
        // Extract text from PDF content streams
        const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g
        let match
        while ((match = streamRegex.exec(raw)) !== null) {
          const chunk = match[1]
          // Extract text from Tj/TJ operators
          const tjRegex = /\(([^)]*)\)\s*Tj/g
          let tjMatch
          while ((tjMatch = tjRegex.exec(chunk)) !== null) {
            text += tjMatch[1] + " "
          }
          // Extract text from TJ arrays
          const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g
          let arrMatch
          while ((arrMatch = tjArrayRegex.exec(chunk)) !== null) {
            const inner = arrMatch[1]
            const parts = inner.match(/\(([^)]*)\)/g)
            if (parts) {
              text += parts.map((p) => p.slice(1, -1)).join("") + " "
            }
          }
        }
        // Fallback: if no text extracted, try raw text between BT/ET
        if (!text.trim()) {
          const btRegex = /BT\s([\s\S]*?)ET/g
          let btMatch
          while ((btMatch = btRegex.exec(raw)) !== null) {
            const inner = btMatch[1]
            const parts = inner.match(/\(([^)]*)\)/g)
            if (parts) {
              text += parts.map((p) => p.slice(1, -1)).join("") + " "
            }
          }
        }
        if (!text.trim()) {
          text = raw
            .replace(/[^\x20-\x7E\n\r\t\u00C0-\u024F\u0400-\u04FF\u00E0-\u00FF]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        }
        setContent(text.substring(0, 10000) || (isTR ? "(PDF icerigi okunamadi - manuel olarak yapistirin)" : "(Could not read PDF content - paste manually)"))
      } else if (ext === "docx") {
        // DOCX is a ZIP, extract word/document.xml and strip XML tags
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        // Find PK signature (ZIP)
        if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
          // Use basic ZIP parsing to find document.xml
          const decoder = new TextDecoder("utf-8", { fatal: false })
          const raw = decoder.decode(bytes)
          // Find document.xml content
          const docMatch = raw.match(/<w:body>([\s\S]*?)<\/w:body>/i)
          if (docMatch) {
            let text = docMatch[1]
              .replace(/<w:p[^>]*>/g, "\n")
              .replace(/<[^>]+>/g, "")
              .replace(/\s+/g, " ")
              .trim()
            setContent(text.substring(0, 10000))
          } else {
            // Fallback: strip all XML
            let text = raw
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .replace(/[^\x20-\x7E\n\r\t\u00C0-\u024F\u0400-\u04FF\u00E0-\u00FF]/g, "")
              .trim()
            setContent(text.substring(0, 10000) || (isTR ? "(DOCX icerigi okunamadi - manuel olarak yapistirin)" : "(Could not read DOCX content - paste manually)"))
          }
        } else {
          setContent(isTR ? "(Gecersiz DOCX dosyasi)" : "(Invalid DOCX file)")
        }
      }
    } catch {
      showToast("error", isTR ? "Dosya okunamadi" : "Failed to read file")
    }
    setFileReading(false)
  }

  // Delete entry
  const handleDelete = async (id: string) => {
    if (!confirm(t("kb_confirm_delete"))) return
    const token = getToken()
    if (!token) return
    setDeletingId(id)
    try {
      await api(`/knowledge-base?id=${id}`, { method: "DELETE", token })
      setItems((prev) => prev.filter((i) => i.id !== id))
      showToast("success", isTR ? "Silindi" : "Deleted")
    } catch (err: any) {
      showToast("error", err.message || (isTR ? "Silinemedi" : "Failed to delete"))
    }
    setDeletingId(null)
  }

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (filterType !== "all" && item.type !== filterType) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q)
      )
    }
    return true
  })

  const tabs = [
    { id: "text" as const, label: t("kb_text"), icon: "\u{1F4DD}" },
    { id: "url" as const, label: t("kb_url"), icon: "\u{1F310}" },
    { id: "file" as const, label: t("kb_file"), icon: "\u{1F4C4}" },
    { id: "faq" as const, label: t("kb_faq"), icon: "\u{2753}" },
  ]

  const typeLabel = (type: string) => {
    if (type === "text") return t("kb_text")
    if (type === "url") return t("kb_url")
    if (type === "faq") return t("kb_faq")
    return type
  }

  const categoryLabel = (cat: string | null) => {
    if (!cat) return ""
    return KB_CATEGORIES.find((c) => c.value === cat)?.label || cat
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="ds-page-header">
        <div>
          <h2 className="ds-page-title">{t("kb_page_title")}</h2>
          <p className="ds-page-subtitle">{t("kb_page_subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="ds-badge text-micro bg-primary/10 text-primary">
            {items.length} {isTR ? "kayit" : "entries"}
          </span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-ui font-bold transition-all ${
          toast.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="p-7 max-w-5xl space-y-6">
        {/* Info callout */}
        <div className="ds-callout-info">
          <p className="text-ui text-accent-blue-deep font-bold mb-1">{t("kb_what_is")}</p>
          <p className="text-caption text-ink-secondary">{t("kb_description")}</p>
        </div>

        {/* === ADD NEW ENTRY === */}
        <div className="ds-card p-6">
          <h3 className="ds-section-title mb-4">{t("kb_add_entry")}</h3>

          {/* Sub-tabs */}
          <div className="flex gap-1 mb-5 border-b border-surface-300">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); resetForm() }}
                className={`px-3 py-2 text-caption font-bold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* TEXT entry */}
          {activeTab === "text" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-bold text-ink-secondary block mb-1">{t("kb_title")}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="ds-input w-full"
                    placeholder={isTR ? "Ornek: Hizmet Fiyatlari 2026" : "Example: Service Prices 2026"}
                  />
                </div>
                <div>
                  <label className="text-caption font-bold text-ink-secondary block mb-1">{t("kb_category")}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="ds-input w-full"
                  >
                    {KB_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-caption font-bold text-ink-secondary block mb-1">{t("kb_content")}</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="ds-input w-full min-h-[180px] resize-y"
                  placeholder={isTR ? "Urun detaylari, hizmet aciklamalari, sirket bilgileri..." : "Product details, service descriptions, company info..."}
                />
              </div>
              <button
                disabled={saving || !title.trim() || !content.trim()}
                onClick={handleSave}
                className="ds-btn-primary"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          )}

          {/* URL entry */}
          {activeTab === "url" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-bold text-ink-secondary block mb-1">{t("kb_title")}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="ds-input w-full"
                    placeholder={isTR ? "Ornek: Ana Sayfa Icerigi" : "Example: Home Page Content"}
                  />
                </div>
                <div>
                  <label className="text-caption font-bold text-ink-secondary block mb-1">{t("kb_category")}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="ds-input w-full"
                  >
                    {KB_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-caption font-bold text-ink-secondary block mb-1">URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="ds-input flex-1"
                    placeholder="https://www.example.com/about"
                  />
                  <button
                    disabled={urlFetching || !url.trim()}
                    onClick={handleFetchUrl}
                    className="ds-btn-primary whitespace-nowrap"
                  >
                    {urlFetching ? t("kb_fetching") : t("kb_fetch_url")}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-caption font-bold text-ink-secondary block mb-1">
                  {isTR ? "Icerik Onizleme" : "Content Preview"}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="ds-input w-full min-h-[180px] resize-y"
                  placeholder={isTR ? "URL'den cekilen icerik burada gorunecek. Duzenleyebilirsiniz." : "Content fetched from URL will appear here. You can edit it."}
                />
              </div>
              <button
                disabled={saving || !title.trim() || !content.trim()}
                onClick={handleSave}
                className="ds-btn-primary"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          )}

          {/* FILE entry */}
          {activeTab === "file" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-caption font-bold text-ink-secondary block mb-1">{t("kb_title")}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="ds-input w-full"
                    placeholder={isTR ? "Dosya basligi" : "File title"}
                  />
                </div>
                <div>
                  <label className="text-caption font-bold text-ink-secondary block mb-1">{t("kb_category")}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="ds-input w-full"
                  >
                    {KB_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* File drop zone */}
              <div
                className="border-2 border-dashed border-surface-350 rounded-lg p-6 text-center hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const file = e.dataTransfer.files?.[0]
                  if (file && fileRef.current) {
                    const dt = new DataTransfer()
                    dt.items.add(file)
                    fileRef.current.files = dt.files
                    fileRef.current.dispatchEvent(new Event("change", { bubbles: true }))
                  }
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="text-3xl mb-2">{fileName ? "\u{2705}" : "\u{1F4E4}"}</div>
                {fileReading ? (
                  <p className="text-caption text-ink-tertiary">{t("kb_reading_file")}</p>
                ) : fileName ? (
                  <p className="text-caption text-ink-secondary font-bold">{fileName}</p>
                ) : (
                  <>
                    <p className="text-caption text-ink-secondary font-bold mb-1">
                      {isTR ? "Dosya yuklemek icin tiklayin veya surukleyin" : "Click or drag to upload a file"}
                    </p>
                    <p className="text-micro text-ink-muted">{t("kb_upload_hint")}</p>
                  </>
                )}
              </div>

              {content && (
                <div>
                  <label className="text-caption font-bold text-ink-secondary block mb-1">
                    {isTR ? "Cikartilan Icerik" : "Extracted Content"}
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="ds-input w-full min-h-[180px] resize-y"
                    placeholder={isTR ? "Dosyadan cikartilan icerik..." : "Content extracted from file..."}
                  />
                </div>
              )}

              <button
                disabled={saving || !title.trim() || !content.trim()}
                onClick={handleSave}
                className="ds-btn-primary"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          )}

          {/* FAQ entry */}
          {activeTab === "faq" && (
            <div className="space-y-3">
              <div>
                <label className="text-caption font-bold text-ink-secondary block mb-1">{t("kb_question")}</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="ds-input w-full"
                  placeholder={isTR ? "Ornek: Kargo ucreti ne kadar?" : "Example: How much is shipping?"}
                />
              </div>
              <div>
                <label className="text-caption font-bold text-ink-secondary block mb-1">{t("kb_answer")}</label>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="ds-input w-full min-h-[120px] resize-y"
                  placeholder={isTR ? "Bu sorunun detayli cevabini yazin..." : "Write a detailed answer to this question..."}
                />
              </div>
              <button
                disabled={saving || !question.trim() || !answer.trim()}
                onClick={handleSave}
                className="ds-btn-primary"
              >
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          )}
        </div>

        {/* === EXISTING ENTRIES === */}
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="ds-section-title">
              {t("kb_saved_items")} ({filteredItems.length})
            </h3>
            <div className="flex items-center gap-2">
              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ds-input text-caption w-48"
                placeholder={t("search")}
              />
              {/* Type filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="ds-input text-caption"
              >
                <option value="all">{t("all")}</option>
                <option value="text">{t("kb_text")}</option>
                <option value="url">{t("kb_url")}</option>
                <option value="faq">{t("kb_faq")}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="ds-card p-6 text-center text-ink-tertiary text-caption">{t("loading")}</div>
          ) : filteredItems.length === 0 ? (
            <div className="ds-card p-8 text-center">
              <p className="text-ink-tertiary text-body mb-1">{t("kb_no_items")}</p>
              <p className="text-ink-muted text-caption">{t("kb_no_items_desc")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="ds-card p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-ui font-bold text-ink truncate">{item.title}</h4>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <span className={`ds-badge text-micro ${
                          item.type === "text" ? "bg-primary/10 text-primary" :
                          item.type === "url" ? "bg-accent-blue/10 text-accent-blue-deep" :
                          "bg-accent-amber/10 text-accent-amber-deep"
                        }`}>
                          {typeLabel(item.type)}
                        </span>
                        {item.category && (
                          <span className="ds-badge text-micro bg-surface-200 text-ink-tertiary">
                            {categoryLabel(item.category)}
                          </span>
                        )}
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ds-badge text-micro bg-accent-blue/5 text-accent-blue-deep hover:underline"
                          >
                            {new URL(item.url).hostname}
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                      className="text-ink-muted hover:text-red-500 transition-colors p-1 shrink-0"
                      title={t("delete")}
                    >
                      {deletingId === item.id ? "..." : "\u2715"}
                    </button>
                  </div>
                  <p className="text-caption text-ink-secondary line-clamp-3">
                    {item.content.slice(0, 200)}{item.content.length > 200 ? "..." : ""}
                  </p>
                  <p className="text-micro text-ink-muted mt-auto">
                    {new Date(item.created_at).toLocaleDateString(isTR ? "tr-TR" : "en-US")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
