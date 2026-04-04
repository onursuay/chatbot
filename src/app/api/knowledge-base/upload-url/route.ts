import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

export const runtime = "nodejs"

const PDF_UPLOAD_BUCKET = "knowledge-base-temp"
const SUPPORTED_PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"])

async function ensurePdfUploadBucket() {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase.storage.getBucket(PDF_UPLOAD_BUCKET)

  if (!error && data) {
    return supabase
  }

  const { error: createError } = await supabase.storage.createBucket(PDF_UPLOAD_BUCKET, {
    public: false,
    fileSizeLimit: 40 * 1024 * 1024,
    allowedMimeTypes: Array.from(SUPPORTED_PDF_MIME_TYPES),
  })

  if (createError && !createError.message.toLowerCase().includes("already exists")) {
    throw createError
  }

  return supabase
}

export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const fileName = typeof body?.fileName === "string" ? body.fileName : ""
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : ""
  const ext = fileName.split(".").pop()?.toLowerCase()

  if (!fileName || ext !== "pdf" || (mimeType && !SUPPORTED_PDF_MIME_TYPES.has(mimeType))) {
    return NextResponse.json({ detail: "invalid_mime" }, { status: 400 })
  }

  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-")
  const filePath = `${auth.org_id}/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`

  try {
    const supabase = await ensurePdfUploadBucket()
    const { data, error } = await supabase.storage
      .from(PDF_UPLOAD_BUCKET)
      .createSignedUploadUrl(filePath, { upsert: true })

    if (error || !data) {
      return NextResponse.json({ detail: error?.message || "parser_exception" }, { status: 500 })
    }

    return NextResponse.json({
      bucket: PDF_UPLOAD_BUCKET,
      filePath: data.path,
      fileName,
      mimeType: mimeType || "application/pdf",
      token: data.token,
    })
  } catch (error: any) {
    return NextResponse.json({ detail: error?.message || "parser_exception" }, { status: 500 })
  }
}
