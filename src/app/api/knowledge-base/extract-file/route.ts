import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

export const runtime = "nodejs"

const MAX_CONTENT_LENGTH = 10000
const PDF_MAGIC_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]
const SUPPORTED_PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"])

function hasPdfHeader(buffer: Uint8Array) {
  return PDF_MAGIC_HEADER.every((byte, index) => buffer[index] === byte)
}

function isPdfMimeType(mimeType: string) {
  return !mimeType || SUPPORTED_PDF_MIME_TYPES.has(mimeType)
}

function normalizeText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\u0000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function extractWithGemini(buffer: Uint8Array): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error("GEMINI_API_KEY not set")

  const base64 = Buffer.from(buffer).toString("base64")

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: "application/pdf",
                data: base64,
              },
            },
            {
              text: "Extract all text content from this PDF document. Return only the raw text content, preserving the structure and paragraphs. Do not add any commentary or explanation.",
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 8192,
      },
    }),
  })

  const data = await res.json()

  if (data.error) {
    throw new Error(data.error.message || "Gemini API error")
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  if (!text) throw new Error("No text extracted by Gemini")

  return normalizeText(text)
}

export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const bucket = typeof body?.bucket === "string" ? body.bucket : ""
  const filePath = typeof body?.filePath === "string" ? body.filePath : ""
  const fileName = typeof body?.fileName === "string" ? body.fileName : ""
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : ""

  if (!bucket || !filePath || !fileName) {
    return NextResponse.json({ detail: "Dosya referansi zorunlu" }, { status: 400 })
  }

  const ext = fileName.split(".").pop()?.toLowerCase()

  if (ext !== "pdf" || !isPdfMimeType(mimeType)) {
    return NextResponse.json({ stage: "input_validation", reason: "invalid_mime" }, { status: 400 })
  }

  try {
    const supabase = getServiceSupabase()
    const { data: storedFile, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath)

    if (downloadError || !storedFile) {
      return NextResponse.json(
        { stage: "download", reason: "parser_exception", errorMessage: downloadError?.message || "download_failed" },
        { status: 400 }
      )
    }

    const buffer = new Uint8Array(await storedFile.arrayBuffer())

    if (!buffer.byteLength) {
      return NextResponse.json({ stage: "buffer", reason: "empty_buffer" }, { status: 400 })
    }

    if (!hasPdfHeader(buffer)) {
      return NextResponse.json({ stage: "validation", reason: "download_invalid_content" }, { status: 400 })
    }

    try {
      const extractedText = await extractWithGemini(buffer)
      return NextResponse.json({ content: extractedText.substring(0, MAX_CONTENT_LENGTH) })
    } catch (geminiError: any) {
      console.error("[PDF][GEMINI_ERROR]", geminiError?.message)
      return NextResponse.json(
        {
          stage: "finalize",
          reason: "parser_exception",
          errorName: "GeminiError",
          errorMessage: geminiError?.message || "extraction_failed",
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error("[PDF][REQUEST_ERROR]", error?.message)
    return NextResponse.json(
      { stage: "request", reason: "parser_exception", errorMessage: error?.message },
      { status: 400 }
    )
  }
}
