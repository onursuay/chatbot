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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{t("automation_rules")}</h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm transition">
          {t("new_rule")}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="text-gray-900 font-medium mb-4">{t("new_automation_form")}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">{t("rule_name")}</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t("trigger")}</label>
                <select value={form.trigger_type} onChange={(e) => setForm({ ...form, trigger_type: e.target.value })}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary">
                  {TRIGGER_TYPES.map((tr) => <option key={tr.value} value={tr.value}>{tr.label}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {TRIGGER_TYPES.find((tr) => tr.value === form.trigger_type)?.desc}
                </p>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t("action")}</label>
                <select value={form.action_type} onChange={(e) => setForm({ ...form, action_type: e.target.value })}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary">
                  {ACTION_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            </div>
            {form.trigger_type === "keyword" && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t("keywords_comma")}</label>
                <input type="text" value={form.trigger_config.keywords}
                  onChange={(e) => setForm({ ...form, trigger_config: { keywords: e.target.value } })}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
                  placeholder={t("example_keywords")} />
              </div>
            )}
            {(form.action_type === "send_message") && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t("message_to_send")}</label>
                <textarea value={form.action_config.message}
                  onChange={(e) => setForm({ ...form, action_config: { message: e.target.value } })}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary h-20 resize-none"
                  placeholder={t("example_price_msg")} />
              </div>
            )}
            {form.action_type === "add_tag" && (
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t("tag_to_add")}</label>
                <input type="text" value={form.action_config.tag || ""}
                  onChange={(e) => setForm({ ...form, action_config: { tag: e.target.value } })}
                  className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
                  placeholder="vip" />
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} disabled={saving}
              className="bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-6 py-2 rounded-lg text-sm transition disabled:opacity-50">
              {saving ? t("saving") : t("create")}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="bg-gray-100 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition">{t("cancel")}</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-500 text-sm">{t("loading")}</p> : automations.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-500">{t("no_automations")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("no_automations_desc")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-gray-900 font-medium">{a.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${a.is_active ? "bg-primary/10 text-primary" : "bg-gray-200 text-gray-400"}`}>
                    {a.is_active ? t("active") : t("passive")}
                  </span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-400">
                  <span>{t("trigger")}: {TRIGGER_TYPES.find((tr) => tr.value === a.trigger_type)?.label || a.trigger_type}</span>
                  <span>{t("action")}: {ACTION_TYPES.find((act) => act.value === a.action_type)?.label || a.action_type}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(a.id, a.is_active)}
                  className={`w-10 h-5 rounded-full transition relative ${a.is_active ? "bg-primary" : "bg-gray-200"}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition ${a.is_active ? "left-5" : "left-0.5"}`} />
                </button>
                <button onClick={() => deleteAutomation(a.id)}
                  className="text-gray-400 hover:text-red-400 transition text-sm ml-2">{t("delete")}</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
