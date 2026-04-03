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

async function extractPdfText(buffer: Uint8Array) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const loadingTask = pdfjsLib.getDocument({
    data: buffer,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
    useWorkerFetch: false,
    stopAtErrors: false,
  })
  const pdf = await loadingTask.promise

  try {
    const pages: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)

      try {
        const textContent = await page.getTextContent({ disableNormalization: false })
        const chunks: string[] = []
        let previousY: number | null = null

        for (const item of textContent.items) {
          if (!("str" in item)) continue

          const rawText = item.str || ""
          const text = rawText.trim()
          const y = Array.isArray(item.transform) ? Number(item.transform[5]) : null

          if (text) {
            if (previousY !== null && y !== null && Math.abs(previousY - y) > 4) {
              chunks.push("\n")
            } else if (chunks.length > 0 && !chunks[chunks.length - 1].endsWith("\n")) {
              chunks.push(" ")
            }

            chunks.push(rawText)
          }

          if (item.hasEOL) {
            chunks.push("\n")
          }

          if (y !== null) {
            previousY = y
          }
        }

        const pageText = normalizeExtractedText(chunks.join(""))
        if (pageText) {
          pages.push(pageText)
        }
      } finally {
        page.cleanup()
      }
    }

    return normalizeExtractedText(pages.join("\n\n"))
  } finally {
    await pdf.destroy()
  }
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

  try {
    const content = await extractPdfText(new Uint8Array(await file.arrayBuffer()))

    if (!content) {
      return NextResponse.json(
        {
          detail:
            "PDF icinde secilebilir metin bulunamadi. " +
            "Sadece metin katmani olan PDF'ler desteklenir; taranmis veya image tabanli PDF'ler desteklenmez.",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      content: content.substring(0, MAX_CONTENT_LENGTH),
    })
  } catch (err: any) {
    console.error("[KNOWLEDGE_BASE][PDF_EXTRACT_FAILED]", {
      file_name: file.name,
      error: err?.message || "pdf_text_extraction_failed",
    })

    return NextResponse.json(
      { detail: err?.message || "PDF icerigi okunamadi" },
      { status: 400 }
    )
  }
}
