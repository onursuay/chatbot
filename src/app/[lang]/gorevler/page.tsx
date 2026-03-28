"use client"

import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useI18n } from "@/lib/i18n"

interface Task {
  id: string
  title: string
  type: string
  priority: string
  assigned_user_name: string | null
  due_at: string | null
  status: string
}

export default function GorevlerPage() {
  const { getToken } = useAuth()
  const { t } = useI18n()
  const [tasks, setTasks] = useState<Task[]>([])
  const [filterStatus, setFilterStatus] = useState("")
  const [filterAssigned, setFilterAssigned] = useState("")
  const [filterType, setFilterType] = useState("")
  const [showForm, setShowForm] = useState(false)

  // Form fields
  const [formTitle, setFormTitle] = useState("")
  const [formType, setFormType] = useState("task")
  const [formPriority, setFormPriority] = useState("medium")
  const [formDueAt, setFormDueAt] = useState("")
  const [formError, setFormError] = useState("")

  const fetchTasks = () => {
    const token = getToken()
    if (!token) return

    const params = new URLSearchParams()
    if (filterStatus) params.set("status", filterStatus)
    if (filterAssigned) params.set("assigned_to", filterAssigned)
    if (filterType) params.set("type", filterType)
    const q = params.toString() ? `?${params.toString()}` : ""

    api<Task[]>(`/tasks${q}`, { token }).then(setTasks).catch(() => {})
  }

  useEffect(() => {
    fetchTasks()
  }, [getToken, filterStatus, filterAssigned, filterType])

  const handleCreate = async () => {
    const token = getToken()
    if (!token) return
    setFormError("")

    try {
      await api("/tasks", {
        token,
        method: "POST",
        body: JSON.stringify({
          title: formTitle,
          type: formType,
          priority: formPriority,
          due_at: formDueAt || undefined,
        }),
      })
      setShowForm(false)
      setFormTitle("")
      setFormType("task")
      setFormPriority("medium")
      setFormDueAt("")
      fetchTasks()
    } catch (err: any) {
      setFormError(err.message || t("error"))
    }
  }

  const handleComplete = async (taskId: string) => {
    const token = getToken()
    if (!token) return

    try {
      await api(`/tasks/${taskId}`, {
        token,
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      })
      fetchTasks()
    } catch {
      // ignore
    }
  }

  const priorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-200 text-gray-600",
      medium: "bg-yellow-500/10 text-yellow-400",
      high: "bg-orange-500/10 text-orange-400",
      urgent: "bg-red-500/10 text-red-400",
    }
    return colors[priority] || "bg-gray-200 text-gray-600"
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{t("tasks")}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary hover:bg-primary/90 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
        >
          {t("create_task")}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3 border-b border-gray-200 flex gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
        >
          <option value="">{t("all_statuses")}</option>
          <option value="pending">{t("pending")}</option>
          <option value="in_progress">{t("in_progress")}</option>
          <option value="completed">{t("completed")}</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary"
        >
          <option value="">{t("all_types")}</option>
          <option value="task">{t("task")}</option>
          <option value="call">{t("call")}</option>
          <option value="email">{t("email")}</option>
          <option value="meeting">{t("meeting")}</option>
        </select>
      </div>

      {/* Create Task Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-gray-900 font-semibold text-lg mb-4">{t("create_task")}</h3>
            {formError && <p className="text-red-400 text-sm mb-3">{formError}</p>}
            <div className="space-y-3">
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder={t("task_title")}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary"
              />
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
              >
                <option value="task">{t("task")}</option>
                <option value="call">{t("call")}</option>
                <option value="email">{t("email")}</option>
                <option value="meeting">{t("meeting")}</option>
              </select>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
              >
                <option value="low">{t("low")}</option>
                <option value="medium">{t("medium")}</option>
                <option value="high">{t("high")}</option>
                <option value="urgent">{t("urgent")}</option>
              </select>
              <input
                type="datetime-local"
                value={formDueAt}
                onChange={(e) => setFormDueAt(e.target.value)}
                className="w-full bg-gray-100 border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-900 text-sm px-4 py-2.5 transition"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                className="bg-primary hover:bg-primary/90 text-gray-900 text-sm font-semibold px-4 py-2.5 rounded-lg transition"
              >
                {t("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500 text-xs uppercase">
              <th className="text-left p-4">{t("title")}</th>
              <th className="text-left p-4">{t("type")}</th>
              <th className="text-left p-4">{t("priority")}</th>
              <th className="text-left p-4">{t("assigned")}</th>
              <th className="text-left p-4">{t("due_at")}</th>
              <th className="text-left p-4">{t("status")}</th>
              <th className="text-left p-4">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                <td className="p-4 text-[14px] text-gray-900 font-medium">{task.title}</td>
                <td className="p-4 text-[14px] text-gray-600 capitalize">{task.type}</td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${priorityBadge(task.priority)}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="p-4 text-[14px] text-gray-600">{task.assigned_user_name || "—"}</td>
                <td className="p-4 text-xs text-gray-400">
                  {task.due_at ? new Date(task.due_at).toLocaleString("tr-TR") : "—"}
                </td>
                <td className="p-4">
                  <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                    task.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-primary/10 text-primary"
                  }`}>
                    {task.status}
                  </span>
                </td>
                <td className="p-4">
                  {task.status !== "completed" && (
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="text-primary hover:text-primary text-xs font-medium transition"
                    >
                      {t("mark_complete")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400 text-[14px]">{t("no_tasks")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
