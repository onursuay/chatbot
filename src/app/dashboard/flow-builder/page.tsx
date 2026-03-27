"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

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

const NODE_TYPES = [
  { type: "trigger", label: "Tetikleyici", color: "bg-purple-500", icon: "⚡" },
  { type: "message", label: "Mesaj Gonder", color: "bg-brand-500", icon: "💬" },
  { type: "condition", label: "Kosul (If/Else)", color: "bg-yellow-500", icon: "🔀" },
  { type: "delay", label: "Bekle", color: "bg-blue-500", icon: "⏱" },
  { type: "action", label: "Aksiyon", color: "bg-red-500", icon: "🎯" },
]

export default function FlowBuilderPage() {
  const { user } = useAuth()
  const [flows, setFlows] = useState<Flow[]>([])
  const [currentFlow, setCurrentFlow] = useState<Flow | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [saving, setSaving] = useState(false)

  const createNewFlow = () => {
    setCurrentFlow({
      name: "Yeni Akis",
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
    alert("Akis kaydedildi!")
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Flow Builder</h2>
          <p className="text-dark-400 text-sm mt-1">Surukle-birak ile otomasyon akislari olusturun</p>
        </div>
        {!showBuilder && (
          <button onClick={createNewFlow}
            className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-4 py-2 rounded-lg text-sm transition">
            + Yeni Akis
          </button>
        )}
      </div>

      {showBuilder && currentFlow ? (
        <div className="space-y-4">
          {/* Flow header */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4 flex items-center justify-between">
            <input
              type="text"
              value={currentFlow.name}
              onChange={(e) => setCurrentFlow({ ...currentFlow, name: e.target.value })}
              className="bg-transparent text-white font-medium text-lg focus:outline-none"
              placeholder="Akis adi..."
            />
            <div className="flex gap-2">
              <button onClick={saveFlow} disabled={saving}
                className="bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-50">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
              <button onClick={() => { setShowBuilder(false); setCurrentFlow(null) }}
                className="bg-dark-800 text-dark-300 hover:text-white px-4 py-2 rounded-lg text-sm transition">
                Iptal
              </button>
            </div>
          </div>

          {/* Node palette */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
            <p className="text-sm text-dark-400 mb-3">Dugum Ekle:</p>
            <div className="flex gap-2 flex-wrap">
              {NODE_TYPES.filter((t) => t.type !== "trigger").map((nt) => (
                <button key={nt.type} onClick={() => addNode(nt.type)}
                  className="flex items-center gap-2 bg-dark-800 hover:bg-dark-700 text-white px-3 py-2 rounded-lg text-sm transition">
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
                      <div className="w-0.5 h-6 bg-dark-700" />
                    </div>
                  )}
                  <div className="bg-dark-900 border border-dark-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 ${nodeType?.color} rounded-lg flex items-center justify-center text-sm`}>
                          {nodeType?.icon}
                        </span>
                        <span className="text-white font-medium text-sm">{nodeType?.label}</span>
                      </div>
                      {node.type !== "trigger" && (
                        <button onClick={() => removeNode(node.id)}
                          className="text-dark-600 hover:text-red-400 text-xs transition">Sil</button>
                      )}
                    </div>

                    {/* Node config */}
                    {node.type === "trigger" && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-dark-500 mb-1">Tetikleyici Tipi</label>
                          <select value={node.data.trigger_type || "keyword"}
                            onChange={(e) => updateNode(node.id, { trigger_type: e.target.value })}
                            className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500">
                            <option value="keyword">Anahtar Kelime</option>
                            <option value="first_message">Ilk Mesaj</option>
                            <option value="business_hours">Mesai Disi</option>
                          </select>
                        </div>
                        {node.data.trigger_type === "keyword" && (
                          <div>
                            <label className="block text-xs text-dark-500 mb-1">Kelimeler (virgul ile)</label>
                            <input type="text" value={node.data.keywords_text || ""}
                              onChange={(e) => updateNode(node.id, { keywords_text: e.target.value, keywords: e.target.value.split(",").map((k: string) => k.trim()) })}
                              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500"
                              placeholder="fiyat, kampanya" />
                          </div>
                        )}
                      </div>
                    )}

                    {node.type === "message" && (
                      <textarea value={node.data.text || ""}
                        onChange={(e) => updateNode(node.id, { text: e.target.value })}
                        className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 h-16 resize-none"
                        placeholder="Gonderilecek mesaj..." />
                    )}

                    {node.type === "condition" && (
                      <div className="grid grid-cols-3 gap-2">
                        <select value={node.data.field || "message"}
                          onChange={(e) => updateNode(node.id, { field: e.target.value })}
                          className="bg-dark-800 border border-dark-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500">
                          <option value="message">Mesaj</option>
                          <option value="contact_name">Kisi Adi</option>
                          <option value="tag">Etiket</option>
                        </select>
                        <select value={node.data.operator || "contains"}
                          onChange={(e) => updateNode(node.id, { operator: e.target.value })}
                          className="bg-dark-800 border border-dark-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500">
                          <option value="contains">Icerir</option>
                          <option value="equals">Esittir</option>
                          <option value="starts_with">Ile baslar</option>
                        </select>
                        <input type="text" value={node.data.value || ""}
                          onChange={(e) => updateNode(node.id, { value: e.target.value })}
                          className="bg-dark-800 border border-dark-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500"
                          placeholder="Deger" />
                      </div>
                    )}

                    {node.type === "delay" && (
                      <div className="flex items-center gap-2">
                        <input type="number" value={node.data.minutes || 5}
                          onChange={(e) => updateNode(node.id, { minutes: parseInt(e.target.value) })}
                          className="w-20 bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500" />
                        <span className="text-sm text-dark-400">dakika bekle</span>
                      </div>
                    )}

                    {node.type === "action" && (
                      <div className="grid grid-cols-2 gap-2">
                        <select value={node.data.action || "add_tag"}
                          onChange={(e) => updateNode(node.id, { action: e.target.value })}
                          className="bg-dark-800 border border-dark-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500">
                          <option value="add_tag">Etiket Ekle</option>
                          <option value="assign_agent">Agent'a Ata</option>
                          <option value="close_conversation">Konusmayi Kapat</option>
                          <option value="enable_bot">Bot'u Ac</option>
                          <option value="disable_bot">Bot'u Kapat</option>
                        </select>
                        {(node.data.action === "add_tag" || node.data.action === "assign_agent") && (
                          <input type="text" value={node.data.value || ""}
                            onChange={(e) => updateNode(node.id, { value: e.target.value })}
                            className="bg-dark-800 border border-dark-700 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-brand-500"
                            placeholder={node.data.action === "add_tag" ? "Etiket" : "Agent email"} />
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
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🔄</div>
          <p className="text-dark-400">Henuz akis olusturulmamis</p>
          <p className="text-dark-600 text-sm mt-1">Gorsel akis olusturucu ile karmasik otomasyonlar kurgulayin</p>
          <button onClick={createNewFlow}
            className="mt-4 bg-brand-500 hover:bg-brand-600 text-dark-950 font-semibold px-6 py-2 rounded-lg text-sm transition">
            Ilk Akisi Olustur
          </button>
        </div>
      )}
    </div>
  )
}
