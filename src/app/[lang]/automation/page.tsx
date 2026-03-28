"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { useI18n } from "@/lib/i18n"

interface Automation {
  id: string
  name: string
  trigger_type: string
  trigger_config: any
  action_type: string
  action_config: any
  is_active: boolean
  priority: number
}

export default function AutomationPage() {
  const { user } = useAuth()
  const { t } = useI18n()

  const TRIGGER_TYPES = [
    { value: "keyword", label: t("keyword"), desc: t("keyword_trigger_desc") },
    { value: "first_message", label: t("first_message"), desc: t("first_message_desc") },
    { value: "business_hours", label: t("business_hours"), desc: t("business_hours_desc") },
  ]

  const ACTION_TYPES = [
    { value: "send_message", label: t("send_message_action") },
    { value: "send_template", label: t("send_template_action") },
    { value: "assign_agent", label: t("assign_agent_action") },
    { value: "add_tag", label: t("add_tag_action") },
    { value: "enable_bot", label: t("enable_bot_action") },
    { value: "disable_bot", label: t("disable_bot_action") },
  ]

  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<{
    name: string
    trigger_type: string
    trigger_config: Record<string, any>
    action_type: string
    action_config: Record<string, any>
  }>({
    name: "",
    trigger_type: "keyword",
    trigger_config: { keywords: "" },
    action_type: "send_message",
    action_config: { message: "" },
  })

  const loadAutomations = async () => {
    if (!user?.org_id) return
    const { data } = await supabase.from("automations").select("*").eq("org_id", user.org_id).order("priority", { ascending: false })
    setAutomations(data || [])
    setLoading(false)
  }

  useEffect(() => { loadAutomations() }, [user])

  const handleCreate = async () => {
    if (!form.name) return alert(t("rule_name"))
    if (!user?.org_id) return
    setSaving(true)
    const triggerConfig = form.trigger_type === "keyword"
      ? { keywords: form.trigger_config.keywords.split(",").map((k: string) => k.trim()) }
      : form.trigger_config
    await supabase.from("automations").insert({
      org_id: user.org_id,
      name: form.name,
      trigger_type: form.trigger_type,
      trigger_config: triggerConfig,
      action_type: form.action_type,
      action_config: form.action_config,
      is_active: true,
    })
    setShowCreate(false)
    setForm({ name: "", trigger_type: "keyword", trigger_config: { keywords: "" }, action_type: "send_message", action_config: { message: "" } })
    loadAutomations()
    setSaving(false)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("automations").update({ is_active: !current }).eq("id", id)
    loadAutomations()
  }

  const deleteAutomation = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return
    await supabase.from("automations").delete().eq("id", id)
    loadAutomations()
  }

  return (
    <div className="p-7">
      <div className="ds-page-header">
        <h2 className="ds-page-title">{t("automation_rules")}</h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="ds-btn-primary">
          {t("new_rule")}
        </button>
      </div>

      {showCreate && (
        <div className="ds-card p-6 mb-6">
          <h3 className="ds-section-title mb-4">{t("new_automation_form")}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-caption-medium text-surface-500 mb-1">{t("rule_name")}</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="ds-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-caption-medium text-surface-500 mb-1">{t("trigger")}</label>
                <select value={form.trigger_type} onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                  className="ds-input">
                  {TRIGGER_TYPES.map((tr) => <option key={tr.value} value={tr.value}>{tr.label}</option>)}
                </select>
                <p className="text-micro text-surface-400 mt-1">
                  {TRIGGER_TYPES.find((tr) => tr.value === form.trigger_type)?.desc}
                </p>
              </div>
              <div>
                <label className="block text-caption-medium text-surface-500 mb-1">{t("action")}</label>
                <select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })}
                  className="ds-input">
                  {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            </div>
            {form.trigger_type === "keyword" && (
              <div>
                <label className="block text-caption-medium text-surface-500 mb-1">{t("keywords_comma")}</label>
                <input type="text" value={form.trigger_config.keywords}
                  onChange={(e) => setForm({ ...form, trigger_config: { keywords: e.target.value } })}
                  className="ds-input"
                  placeholder={t("example_keywords")} />
              </div>
            )}
            {(form.action_type === "send_message") && (
              <div>
                <label className="block text-caption-medium text-surface-500 mb-1">{t("message_to_send")}</label>
                <textarea value={form.action_config.message}
                  onChange={(e) => setForm({ ...form, action_config: { message: e.target.value } })}
                  className="ds-input h-20 resize-none"
                  placeholder={t("example_price_msg")} />
              </div>
            )}
            {form.action_type === "add_tag" && (
              <div>
                <label className="block text-caption-medium text-surface-500 mb-1">{t("tag_to_add")}</label>
                <input type="text" value={form.action_config.tag || ""}
                  onChange={(e) => setForm({ ...form, action_config: { tag: e.target.value } })}
                  className="ds-input"
                  placeholder="vip" />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} disabled={saving}
              className="ds-btn-primary disabled:opacity-50">
              {saving ? t("saving") : t("create")}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="ds-btn-secondary">{t("cancel")}</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-surface-500 text-caption">{t("loading")}</p> : automations.length === 0 ? (
        <div className="ds-empty-state">
          <p className="ds-empty-state-title">{t("no_automations")}</p>
          <p className="ds-empty-state-desc">{t("no_automations_desc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a.id} className="ds-card p-5 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-body-medium font-medium">{a.name}</h3>
                  <span className={`${a.is_active ? "ds-badge-primary" : "ds-badge-neutral"}`}>
                    {a.is_active ? t("active") : t("passive")}
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-caption text-surface-400">
                  <span>{t("trigger")}: {TRIGGER_TYPES.find((tr) => tr.value === a.trigger_type)?.label || a.trigger_type}</span>
                  <span>{t("action")}: {ACTION_TYPES.find((act) => act.value === a.action_type)?.label || a.action_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(a.id, a.is_active)}
                  className={`w-10 h-5 rounded-full transition relative ${a.is_active ? "bg-primary" : "bg-surface-200"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition ${a.is_active ? "left-5" : "left-0.5"}`} />
                </button>
                <button onClick={() => deleteAutomation(a.id)}
                  className="text-surface-400 hover:text-red-400 transition text-caption ml-2">{t("delete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
