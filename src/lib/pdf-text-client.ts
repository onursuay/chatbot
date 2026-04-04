"use client"

export async function extractPdfTextClient(file: File, maxLength = 10000) {
  const formData = new FormData()
  formData.append("file", file)

  const token = localStorage.getItem("access_token")
  const response = await fetch("/api/knowledge-base/extract-file", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  })

  if (response.ok) {
    const data = await response.json()
    const content = typeof data?.content === "string" ? data.content : ""
    return content.substring(0, maxLength)
  }

  const error = await response.json().catch(() => ({ detail: "parser_exception" }))
  throw new Error(error?.detail || "parser_exception")
}
