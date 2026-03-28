"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { useI18n } from "@/lib/i18n"

interface FlowNode {
  id: string
  type: "trigger" | "message" | "condition" | "delay" | "action"
  data: Record<string, any>
  next?: string[]
}

interface Flow {
  id?: string
  name: string
  nodes: FlowNode[]
  is_active: boolean
}

export default function FlowBuilderPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const [flows, setFlows] = useState<Flow[]>([])
  const [currentFlow, setCurrentFlow] = useState<Flow | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [saving, setSaving] = useState(false)

  const NODE_TYPES = [
    { type: "trigger", label: t("trigger_node"), color: "bg-purple-500", icon: "⚡" },
    { type: "message", label: t("message_node"), color: "bg-primary", icon: "💬" },
    { type: "condition", label: t("condition_node"), color: "bg-yellow-500", icon: "🔀" },
    { type: "delay", label: t("delay_node"), color: "bg-blue-500", icon: "⏱" },
    { type: "action", label: t("action_node"), color: "bg-red-500", icon: "🎯" },
  ]

  const createNewFlow = () => {
    setCurrentFlow({
      name: "",
      nodes: [
        { id: "1", type: "trigger", data: { trigger_type: "keyword", keywords: [] } },
      ],
      is_active: false,
    })
    setShowBuilder(true)
  }

  const addNode = (type: string) => {
    if (!currentFlow) return
    const newNode: FlowNode = {
      id: String(currentFlow.nodes.length + 1),
      type: type as FlowNode["type"],
      data: type === "message" ? { text: "" } :
            type === "condition" ? { field: "message", operator: "contains", value: "" } :
            type === "delay" ? { minutes: 5 } :
            type === "action" ? { action: "add_tag", value: "" } : {},
    }
    setCurrentFlow({
      ...currentFlow,
      nodes: [...currentFlow.nodes, newNode],
    })
  }

  const updateNode = (nodeId: string, data: Record<string, any>) => {
    if (!currentFlow) return
    setCurrentFlow({
      ...currentFlow,
      nodes: currentFlow.nodes.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n),
    })
  }

  const removeNode = (nodeId: string) => {
    if (!currentFlow) return
    setCurrentFlow({
      ...currentFlow,
      nodes: currentFlow.nodes.filter((n) => n.id !== nodeId),
    })
  }

  const saveFlow = async () => {
    if (!currentFlow || !user?.org_id) return
    setSaving(true)

    // Otomasyon olarak kaydet (flow nodes JSON olarak)
    const triggerNode = currentFlow.nodes.find((n) => n.type === "trigger")
    await supabase.from("automations").insert({
      org_id: user.org_id,
      name: currentFlow.name,
      trigger_type: triggerNode?.data.trigger_type || "keyword",
      trigger_config: triggerNode?.data || {},
      action_type: "flow",
      action_config: { nodes: currentFlow.nodes },
      is_active: currentFlow.is_active,
    })

    setShowBuilder(false)
    setCurrentFlow(null)
    setSaving(false)
    alert(t("flow_saved"))
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t("flow_builder")}</h2>
          <p className="text-gray-500 text-sm mt-1">{t("flow_builder_desc")}</p>
        </div>
        {!showBuilder && (
          <button onClick={createNewFlow}
            className="bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm transition">
            {t("new_flow")}
          </button>
        )}
      </div>

      {showBuilder && currentFlow ? (
        <div className="space-y-4">
          {/* Flow header */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
            <input
              type="text"
              value={currentFlow.name}
              onChange={(e) => setCurrentFlow({ ...currentFlow, name: e.target.value })}
              className="bg-transparent text-gray-900 font-medium text-lg focus:outline-none"
              placeholder={t("flow_name")}
            />
            <div className="flex gap-2">
              <button onClick={saveFlow} disabled={saving}
                className="bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-50">
                {saving ? t("saving") : t("save")}
              </button>
              <button onClick={() => { setShowBuilder(false); setCurrentFlow(null) }}
                className="bg-gray-100 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg text-sm transition">
                {t("cancel")}
              </button>
            </div>
          </div>

          {/* Node palette */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500 mb-3">{t("add_node")}</p>
            <div className="flex gap-2 flex-wrap">
              {NODE_TYPES.filter((nt) => nt.type !== "trigger").map((nt) => (
                <button key={nt.type} onClick={() => addNode(nt.type)}
                  className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 px-3 py-2 rounded-lg text-sm transition">
                  <span>{nt.icon}</span>
                  <span>{nt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Flow canvas */}
          <div className="space-y-2">
            {currentFlow.nodes.map((node, i) => {
              const nodeType = NODE_TYPES.find((nt) => nt.type === node.type)
              return (
                <div key={node.id}>
                  {i > 0 && (
                    <div className="flex justify-center py-1">
                      <div className="w-0.5 h-6 bg-gray-200" />
                    </div>
                  )}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 ${nodeType?.color} rounded-lg flex items-center justify-center text-sm`}>
                          {nodeType?.icon}
                        </span>
                        <span className="text-gray-900 font-medium text-sm">{nodeType?.label}</span>
                      </div>
                      {node.type !== "trigger" && (
                        <button onClick={() => removeNode(node.id)}
                          className="text-gray-400 hover:text-red-400 text-xs transition">{t("delete")}</button>
                      )}
                    </div>

                    {/* Node config */}
                    {node.type === "trigger" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">{t("trigger_type")}</label>
                          <select value={node.data.trigger_type || "keyword"}
                            onChange={(e) => updateNode(node.id, { trigger_type: e.target.value })}
                            className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-primary">
                            <option value="keyword">{t("keyword")}</option>
                            <option value="first_message">{t("first_message")}</option>
                            <option value="business_hours">{t("business_hours")}</option>
                          </select>
                        </div>
                        {node.data.trigger_type === "keyword" && (
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">{t("keywords_label")}</label>
                            <input type="text" value={node.data.keywords_text || ""}
                              onChange={(e) => updateNode(node.id, { keywords_text: e.target.value, keywords: e.target.value.split(",").map((k: string) => k.trim()) })}
                              className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
                              placeholder="fiyat, kampanya" />
                          </div>
                        )}
                      </div>
                    )}

                    {node.type === "message" && (
                      <textarea value={node.data.text || ""}
                        onChange={(e) => updateNode(node.id, { text: e.target.value })}
                        className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary h-16 resize-none"
                        placeholder={t("message_to_send") + "..."} />
                    )}

                    {node.type === "condition" && (
                      <div className="grid grid-cols-3 gap-2">
                        <select value={node.data.field || "message"}
                          onChange={(e) => updateNode(node.id, { field: e.target.value })}
                          className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-primary">
                          <option value="message">{t("condition_message")}</option>
                          <option value="contact_name">{t("condition_contact_name")}</option>
                          <option value="tag">{t("condition_tag")}</option>
                        </select>
                        <select value={node.data.operator || "contains"}
                          onChange={(e) => updateNode(node.id, { operator: e.target.value })}
                          className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-primary">
                          <option value="contains">{t("contains")}</option>
                          <option value="equals">{t("equals")}</option>
                          <option value="starts_with">{t("starts_with")}</option>
                        </select>
                        <input type="text" value={node.data.value || ""}
                          onChange={(e) => updateNode(node.id, { value: e.target.value })}
                          className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
                          placeholder={t("condition_value")} />
                      </div>
                    )}

                    {node.type === "delay" && (
                      <div className="flex items-center gap-2">
                        <input type="number" value={node.data.minutes || 5}
                          onChange={(e) => updateNode(node.id, { minutes: parseInt(e.target.value) })}
                          className="w-20 bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-primary" />
                        <span className="text-sm text-gray-500">{t("minutes_wait")}</span>
                      </div>
                    )}

                    {node.type === "action" && (
                      <div className="grid grid-cols-2 gap-2">
                        <select value={node.data.action || "add_tag"}
                          onChange={(e) => updateNode(node.id, { action: e.target.value })}
                          className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-primary">
                          <option value="add_tag">{t("add_tag_action")}</option>
                          <option value="assign_agent">{t("assign_agent_action")}</option>
                          <option value="close_conversation">{t("close_conversation")}</option>
                          <option value="enable_bot">{t("enable_bot_action")}</option>
                          <option value="disable_bot">{t("disable_bot_action")}</option>
                        </select>
                        {(node.data.action === "add_tag" || node.data.action === "assign_agent") && (
                          <input type="text" value={node.data.value || ""}
                            onChange={(e) => updateNode(node.id, { value: e.target.value })}
                            className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
                            placeholder={node.data.action === "add_tag" ? t("condition_tag") : "Agent email"} />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🔄</div>
          <p className="text-gray-500">{t("no_flows")}</p>
          <p className="text-gray-400 text-sm mt-1">{t("no_flows_desc")}</p>
          <button onClick={createNewFlow}
            className="mt-4 bg-primary hover:bg-primary/90 text-gray-900 font-semibold px-6 py-2 rounded-lg text-sm transition">
            {t("create_first_flow")}
          </button>
        </div>
      )}
    </div>
  )
}
