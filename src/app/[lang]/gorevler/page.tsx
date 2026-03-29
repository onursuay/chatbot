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
      low: "ds-badge-neutral",
      medium: "ds-badge-warning",
      high: "ds-badge-warning",
      urgent: "ds-badge-danger",
    }
    return colors[priority] || "ds-badge-neutral"
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="ds-page-header px-7 py-5 border-b border-surface-300">
        <h2 className="ds-page-title">{t("tasks")}</h2>
        <button
          onClick={() => setShowForm(true)}
          className="ds-btn-primary"
        >
          {t("create_task")}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="px-7 py-3 border-b border-surface-300 flex gap-3 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="ds-select w-auto"
        >
          <option value="">{t("all_statuses")}</option>
          <option value="pending">{t("pending")}</option>
          <option value="in_progress">{t("in_progress")}</option>
          <option value="completed">{t("completed")}</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="ds-select w-auto"
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
        <div className="ds-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="ds-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ds-modal-title">{t("create_task")}</h3>
            {formError && <p className="text-red-400 text-caption mb-3">{formError}</p>}
            <div className="space-y-3">
              <div className="ds-form-group">
                <label className="ds-form-label">{t("task_title")}</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={t("task_title")}
                  className="ds-input w-full"
                />
              </div>
              <div className="ds-form-group">
                <label className="ds-form-label">{t("type")}</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="ds-select w-full"
                >
                  <option value="task">{t("task")}</option>
                  <option value="call">{t("call")}</option>
                  <option value="email">{t("email")}</option>
                  <option value="meeting">{t("meeting")}</option>
                </select>
              </div>
              <div className="ds-form-group">
                <label className="ds-form-label">{t("priority")}</label>
                <select
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                  className="ds-select w-full"
                >
                  <option value="low">{t("low")}</option>
                  <option value="medium">{t("medium")}</option>
                  <option value="high">{t("high")}</option>
                  <option value="urgent">{t("urgent")}</option>
                </select>
              </div>
              <div className="ds-form-group">
                <label className="ds-form-label">{t("due_at")}</label>
                <input
                  type="datetime-local"
                  value={formDueAt}
                  onChange={(e) => setFormDueAt(e.target.value)}
                  className="ds-input w-full"
                />
              </div>
            </div>
            <div className="ds-modal-actions">
              <button
                onClick={() => setShowForm(false)}
                className="ds-btn-ghost"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleCreate}
                className="ds-btn-primary"
              >
                {t("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="ds-table w-full">
          <thead>
            <tr className="ds-table-header">
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
              <tr key={task.id} className="ds-table-row">
                <td className="p-4 text-ui text-ink font-medium">{task.title}</td>
                <td className="p-4 text-ui text-ink-secondary capitalize">{task.type}</td>
                <td className="p-4">
                  <span className={`capitalize ${priorityBadge(task.priority)}`}>
                    {task.priority}
                  </span>
                </td>
                <td className="p-4 text-ui text-ink-secondary">{task.assigned_user_name || "\u2014"}</td>
                <td className="p-4 text-caption text-ink-tertiary">
                  {task.due_at ? new Date(task.due_at).toLocaleString("tr-TR") : "\u2014"}
                </td>
                <td className="p-4">
                  <span className={`${
                    task.status === "completed" ? "ds-badge-success" : "ds-badge-primary"
                  } capitalize`}>
                    {task.status}
                  </span>
                </td>
                <td className="p-4">
                  {task.status !== "completed" && (
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="text-primary hover:text-primary text-caption-medium font-medium transition"
                    >
                      {t("mark_complete")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-ink-tertiary text-ui">{t("no_tasks")}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
