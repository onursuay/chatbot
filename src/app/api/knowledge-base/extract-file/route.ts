import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"

export const runtime = "nodejs"

const MAX_CONTENT_LENGTH = 10000

function normalizeExtractedText(text: string) {
  return text
    .normalize("NFKC")
    .replace(/\u0000/g, " ")
    .replace(/\u00ad/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function extractPdfTextWithParser(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })

  try {
    const result = await parser.getText()
    return normalizeExtractedText(result.text || "")
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

async function extractPdfTextWithGemini(buffer: Buffer) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return ""

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  "Bu PDF dosyasindaki tum okunabilir metni cikar. Turkce karakterleri dogru koru. " +
                  "Sadece temiz duz metin don, aciklama veya ozet ekleme.",
              },
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: buffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 4096,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || "AI PDF extraction failed")
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  return normalizeExtractedText(text)
}

export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const formData = await request.formData()
  const fileValue = formData.get("file")

  if (!fileValue || typeof fileValue === "string" || typeof fileValue.arrayBuffer !== "function") {
    return NextResponse.json({ detail: "Dosya zorunlu" }, { status: 400 })
  }

  const file = fileValue as File

  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext !== "pdf") {
    return NextResponse.json({ detail: "Sadece PDF destekleniyor" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const extractionErrors: string[] = []

  try {
    const parsedContent = await extractPdfTextWithParser(buffer)
    if (parsedContent) {
      return NextResponse.json({
        content: parsedContent.substring(0, MAX_CONTENT_LENGTH),
      })
    }
  } catch (err: any) {
    extractionErrors.push(err?.message || "pdf-parse failed")
  }

  try {
    const aiContent = await extractPdfTextWithGemini(buffer)
    if (aiContent) {
      return NextResponse.json({
        content: aiContent.substring(0, MAX_CONTENT_LENGTH),
      })
    }
  } catch (err: any) {
    extractionErrors.push(err?.message || "gemini pdf extraction failed")
  }

  console.error("[KNOWLEDGE_BASE][PDF_EXTRACT_FAILED]", {
    file_name: file.name,
    errors: extractionErrors,
  })

  return NextResponse.json(
    {
      detail:
        extractionErrors[0] ||
        "PDF icinde okunabilir metin bulunamadi",
    },
    { status: 400 }
  )
}
