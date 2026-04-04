"use client"

import { supabase } from "@/lib/supabase"

type SignedUploadTarget = {
  bucket: string
  filePath: string
  fileName: string
  mimeType: string
  token: string
}

export async function extractPdfTextClient(file: File, maxLength = 10000) {
  const token = localStorage.getItem("access_token")
  const uploadTargetResponse = await fetch("/api/knowledge-base/upload-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/pdf",
    }),
  })

  if (uploadTargetResponse.status === 413) {
    throw new Error("PDF yukleme istegi cok buyuk. Lutfen tekrar deneyin.")
  }

  if (!uploadTargetResponse.ok) {
    const error = await uploadTargetResponse.json().catch(() => ({ detail: "parser_exception" }))
    throw new Error(error?.detail || "parser_exception")
  }

  const uploadTarget = await uploadTargetResponse.json() as SignedUploadTarget
  const { error: uploadError } = await supabase.storage
    .from(uploadTarget.bucket)
    .uploadToSignedUrl(uploadTarget.filePath, uploadTarget.token, file, {
      contentType: uploadTarget.mimeType || file.type || "application/pdf",
    })

  if (uploadError) {
    throw new Error(uploadError.message || "parser_exception")
  }

  const response = await fetch("/api/knowledge-base/extract-file", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      bucket: uploadTarget.bucket,
      filePath: uploadTarget.filePath,
      fileName: uploadTarget.fileName,
      mimeType: uploadTarget.mimeType,
    }),
  })

  if (response.ok) {
    const data = await response.json()
    const content = typeof data?.content === "string" ? data.content : ""
    return content.substring(0, maxLength)
  }

  if (response.status === 413) {
    throw new Error("PDF isleme istegi cok buyuk. Dosya storage'a yuklendi, ancak parse servisi yanit veremedi.")
  }

  const error = await response.json().catch(() => ({ detail: "parser_exception" }))
  throw new Error(error?.detail || "parser_exception")
}
