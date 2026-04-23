"use client"

import { useEffect, useState, useCallback } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface Broadcast {
  id: string
  name: string
  status: string
  total_recipients: number
  sent_count: number
  delivered_count: number
  read_count: number
  failed_count: number
  created_at: string
}

interface Template {
  name: string
  status: string
  category: string
  language: string
}

interface AvailablePhone {
  id: string
  number: string
  verified_name: string | null
}

interface Contact {
  id: string
  name: string | null
  profile_name: string | null
  phone: string | null
  wa_id: string
  tags: string[]
}

export default function BroadcastPage() {
  const { getToken } = useAuth()
  const { t, lang } = useI18n()

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [phoneNumbers, setPhoneNumbers] = useState<AvailablePhone[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set())

  const [form, setForm] = useState({
    name: "",
    template_name: "",
    language: "en",
    tag_filter: "",
  })
  const [formPhoneNumberId, setFormPhoneNumberId] = useState("")

  const dateLocale = lang === "tr" ? "tr-TR" : "en-US"

  useEffect(() => {
    const token = getToken()
    if (!token) return
    Promise.all([
      api<Broadcast[]>("/broadcasts", { token }),
      api<Template[]>("/templates", { token }).catch(() => []),
      api<any>("/channels/status", { token }).catch(() => null),
      api<Contact[]>("/contacts?per_page=200", { token }).catch(() => []),
    ]).then(([b, tpl, channelStatus, contacts]) => {
      setBroadcasts(b || [])
      setTemplates((tpl || []).filter((item: Template) => item.status === "APPROVED"))

      const phones: AvailablePhone[] = []
      if (channelStatus?.accounts) {
        for (const waba of channelStatus.accounts) {
          for (const phone of waba.phone_numbers || []) {
            phones.push({ id: phone.id, number: phone.number, verified_name: phone.verified_name })
          }
        }
      }
      setPhoneNumbers(phones)
      if (phones.length > 0) setFormPhoneNumberId(phones[0].id)

      // Tüm benzersiz etiketleri topla
      const tagSet = new Set<string>()
      for (const c of contacts || []) {
        for (const tag of c.tags || []) tagSet.add(tag)
      }
      setAllTags(Array.from(tagSet).sort())
      setPreviewContacts(contacts || [])
      setSelectedContactIds(new Set((contacts || []).map((c) => c.id)))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [getToken])

  const fetchPreview = useCallback(async (tagFilter: string) => {
    const token = getToken()
    if (!token) return
    setPreviewLoading(true)
    try {
      const url = tagFilter
        ? `/contacts?per_page=200&tag=${encodeURIComponent(tagFilter)}`
        : "/contacts?per_page=200"
      const contacts = await api<Contact[]>(url, { token })
      setPreviewContacts(contacts || [])
      setSelectedContactIds(new Set((contacts || []).map((c) => c.id)))
    } catch {}
    setPreviewLoading(false)
  }, [getToken])

  const handleTagChange = (tag: string) => {
    setForm((prev) => ({ ...prev, tag_filter: tag }))
    fetchPreview(tag)
  }

  const toggleContact = (id: string) => {
    setSelectedContactIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedContactIds.size === previewContacts.length && previewContacts.length > 0) {
      setSelectedContactIds(new Set())
    } else {
      setSelectedContactIds(new Set(previewContacts.map((c) => c.id)))
    }
  }

  const handleSend = async () => {
    if (!form.template_name) return alert(t("select_template"))
    if (selectedContactIds.size === 0) return alert(lang === "tr" ? "Lütfen en az bir kişi seçin" : "Please select at least one contact")
    const token = getToken()
    if (!token) return
    setSending(true)
    try {
      const result = await api<Broadcast>("/broadcasts", {
        method: "POST", token,
        body: JSON.stringify({
          ...form,
          phone_number_id: formPhoneNumberId || undefined,
          contact_ids: Array.from(selectedContactIds),
        }),
      })
      setBroadcasts((prev) => [result, ...prev])
      setShowCreate(false)
      setForm({ name: "", template_name: "", language: "en", tag_filter: "" })
    } catch (err: any) {
      alert(err.message || t("failed"))
    }
    setSending(false)
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "ds-badge-neutral",
      scheduled: "ds-badge-warning",
      sending: "ds-badge-warning",
      completed: "ds-badge-success",
    }
    return map[status] || "ds-badge-neutral"
  }

  const selectedTemplate = templates.find((tpl) => tpl.name === form.template_name)

  return (
    <div className="p-7">
      <div className="ds-page-header">
        <h2 className="ds-page-title">{t("broadcast")}</h2>
        <button onClick={() => setShowCreate(!showCreate)} className="ds-btn-primary">
          {t("new_campaign")}
        </button>
      </div>

      {showCreate && (
        <div className="ds-card p-6 mb-6">
          <h3 className="ds-section-title mb-5">{t("new_campaign_form")}</h3>

          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Kampanya Adı */}
            <div>
              <label className="block text-caption-medium text-ink-secondary mb-1">{t("campaign_name")}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="ds-input w-full"
                placeholder={t("example_campaign")}
              />
            </div>

            {/* Template Seç */}
            <div>
              <label className="block text-caption-medium text-ink-secondary mb-1">{t("message_template")}</label>
              <select
                value={form.template_name}
                onChange={(e) => setForm({ ...form, template_name: e.target.value })}
                className="ds-select w-full"
              >
                <option value="">{t("select_template")}</option>
                {templates.map((tpl) => (
                  <option key={tpl.name} value={tpl.name}>
                    {tpl.name} ({tpl.category})
                  </option>
                ))}
              </select>
              {templates.length === 0 && (
                <p className="text-micro text-red-500 mt-1">{t("no_approved_templates")}</p>
              )}
            </div>

            {/* Dil */}
            <div>
              <label className="block text-caption-medium text-ink-secondary mb-1">{t("language")}</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="ds-select w-full"
              >
                <option value="en">English</option>
                <option value="tr">{t("turkish")}</option>
              </select>
              {selectedTemplate && (
                <p className="text-micro text-ink-tertiary mt-1">
                  {lang === "tr" ? "Şablon dili:" : "Template language:"} {selectedTemplate.language}
                </p>
              )}
            </div>

            {/* Hedef Etiket */}
            <div>
              <label className="block text-caption-medium text-ink-secondary mb-1">{t("target_tag")}</label>
              <select
                value={form.tag_filter}
                onChange={(e) => handleTagChange(e.target.value)}
                className="ds-select w-full"
              >
                <option value="">{t("tag_empty_hint")}</option>
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>

            {/* Telefon Numarası (birden fazla varsa) */}
            {phoneNumbers.length > 1 && (
              <div className="col-span-2">
                <label className="block text-caption-medium text-ink-secondary mb-1">{t("phone_number")}</label>
                <select
                  value={formPhoneNumberId}
                  onChange={(e) => setFormPhoneNumberId(e.target.value)}
                  className="ds-select w-full"
                >
                  {phoneNumbers.map((phone) => (
                    <option key={phone.id} value={phone.id}>
                      {phone.number}{phone.verified_name ? ` — ${phone.verified_name}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Kişi Önizlemesi */}
          <div className="border border-surface-border rounded-lg p-4 mb-4 bg-surface-50">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedContactIds.size === previewContacts.length && previewContacts.length > 0}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedContactIds.size > 0 && selectedContactIds.size < previewContacts.length
                  }}
                  onChange={toggleAll}
                  className="rounded border-surface-300 text-primary focus:ring-primary"
                />
                <span className="text-caption-medium text-ink-secondary">
                  {lang === "tr" ? "Gönderilecek kişiler" : "Recipients"}
                </span>
              </label>
              {previewLoading ? (
                <span className="text-caption text-ink-tertiary">{t("loading")}</span>
              ) : (
                <span className="ds-badge-success text-[11px]">
                  {selectedContactIds.size} / {previewContacts.length} {lang === "tr" ? "seçili" : "selected"}
                </span>
              )}
            </div>

            {previewLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : previewContacts.length === 0 ? (
              <p className="text-caption text-ink-tertiary">
                {lang === "tr" ? "Bu filtreye uygun kişi bulunamadı" : "No contacts match this filter"}
              </p>
            ) : (
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {previewContacts.slice(0, 100).map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-surface-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContactIds.has(c.id)}
                      onChange={() => toggleContact(c.id)}
                      className="rounded border-surface-300 text-primary focus:ring-primary shrink-0"
                    />
                    <span className="text-caption text-ink flex-1 truncate">
                      {c.name || c.profile_name || (lang === "tr" ? "İsimsiz" : "Unnamed")}
                    </span>
                    <span className="text-micro text-ink-tertiary shrink-0">{c.phone || c.wa_id}</span>
                  </label>
                ))}
                {previewContacts.length > 100 && (
                  <p className="text-micro text-ink-tertiary text-center pt-1">
                    +{previewContacts.length - 100} {lang === "tr" ? "kişi daha" : "more"}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={sending || selectedContactIds.size === 0 || !form.template_name}
              className="ds-btn-primary disabled:opacity-50 flex items-center gap-2"
            >
              {sending && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {sending ? t("sending") : `${t("send_now")} (${selectedContactIds.size})`}
            </button>
            <button onClick={() => setShowCreate(false)} className="ds-btn-secondary">{t("cancel")}</button>
          </div>
        </div>
      )}

      {/* Broadcast Listesi */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="ds-card p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-5 bg-gray-200 rounded w-20" />
              </div>
              <div className="grid grid-cols-5 gap-4">
                {[1,2,3,4,5].map((j) => (
                  <div key={j} className="h-10 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : broadcasts.length === 0 ? (
        <div className="ds-empty-state">
          <p className="ds-empty-state-title">{t("no_campaigns")}</p>
          <p className="ds-empty-state-desc">{t("no_campaigns_desc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <div key={b.id} className="ds-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-body-medium font-medium">{b.name}</h3>
                <span className={`${statusBadge(b.status)}`}>{t(b.status) || b.status}</span>
              </div>
              <div className="grid grid-cols-5 gap-4 text-center">
                {[
                  { v: b.total_recipients, l: t("recipients"), c: "text-ink" },
                  { v: b.sent_count, l: t("sent"), c: "text-primary" },
                  { v: b.delivered_count, l: t("delivered"), c: "text-blue-600" },
                  { v: b.read_count, l: t("read"), c: "text-purple-600" },
                  { v: b.failed_count, l: t("failed"), c: "text-red-600" },
                ].map((stat) => (
                  <div key={stat.l}>
                    <p className={`text-xl font-bold ${stat.c}`}>{stat.v ?? 0}</p>
                    <p className="text-caption text-ink-tertiary">{stat.l}</p>
                  </div>
                ))}
              </div>
              <p className="text-caption text-ink-tertiary mt-3">
                {new Date(b.created_at).toLocaleDateString(dateLocale, { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
