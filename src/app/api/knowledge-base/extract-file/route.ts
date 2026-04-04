import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"

export const runtime = "nodejs"

const MAX_CONTENT_LENGTH = 10000
const PDF_MAGIC_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]
const SUPPORTED_PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"])

type PdfErrorReason =
  | "invalid_mime"
  | "empty_buffer"
  | "encrypted_pdf"
  | "image_only_pdf"
  | "empty_text"
  | "parser_exception"

type PdfParseResult = {
  extractedText: string
  pageCount: number
}

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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  return "unknown_error"
}

function logPdfError(
  reason: PdfErrorReason,
  file: { name: string; type: string; size: number },
  buffer: Uint8Array | null,
  error?: unknown
) {
  console.error("[PDF][ERROR]", {
    reason,
    filename: file.name,
    mimeType: file.type || null,
    size: file.size,
    byteLength: buffer?.byteLength ?? 0,
    message: error ? getErrorMessage(error) : undefined,
  })
}

function isPdfMimeType(mimeType: string) {
  return !mimeType || SUPPORTED_PDF_MIME_TYPES.has(mimeType)
}

function hasPdfHeader(buffer: Uint8Array) {
  return PDF_MAGIC_HEADER.every((byte, index) => buffer[index] === byte)
}

function mayBeEncryptedPdf(buffer: Uint8Array) {
  const sample = Buffer.from(buffer.subarray(0, Math.min(buffer.byteLength, 4096))).toString("latin1")
  return sample.includes("/Encrypt")
}

function detectParserErrorReason(error: unknown, buffer: Uint8Array): PdfErrorReason {
  const message = getErrorMessage(error).toLowerCase()
  const errorName = error instanceof Error ? error.name : ""

  if (
    errorName === "PasswordException" ||
    message.includes("password") ||
    message.includes("encrypted") ||
    mayBeEncryptedPdf(buffer)
  ) {
    return "encrypted_pdf"
  }

  return "parser_exception"
}

async function extractPdfTextWithPdfParse(buffer: Uint8Array): Promise<PdfParseResult> {
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: buffer })

  try {
    const result = await parser.getText()
    return {
      extractedText: normalizeExtractedText(result?.text || ""),
      pageCount: Number(result?.total || result?.pages?.length || 0),
    }
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}

async function extractPdfTextWithPdfJs(buffer: Uint8Array): Promise<PdfParseResult> {
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

    return {
      extractedText: normalizeExtractedText(pages.join("\n\n")),
      pageCount: Number(pdf.numPages || 0),
    }
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
  const mimeType = file.type || ""

  console.log("[PDF][UPLOAD]", {
    filename: file.name,
    mimeType: mimeType || null,
    size: file.size,
  })

  try {
    const buffer = new Uint8Array(await file.arrayBuffer())

    console.log("[PDF][BUFFER]", {
      byteLength: buffer.byteLength,
    })

    if (ext !== "pdf" || !isPdfMimeType(mimeType)) {
      logPdfError("invalid_mime", file, buffer)
      return NextResponse.json({ detail: "invalid_mime" }, { status: 400 })
    }

    if (!buffer.byteLength) {
      logPdfError("empty_buffer", file, buffer)
      return NextResponse.json({ detail: "empty_buffer" }, { status: 400 })
    }

    if (!hasPdfHeader(buffer)) {
      logPdfError("invalid_mime", file, buffer)
      return NextResponse.json({ detail: "invalid_mime" }, { status: 400 })
    }

    let extractedText = ""
    let pageCount = 0
    let parserError: unknown = null

    try {
      const parsed = await extractPdfTextWithPdfParse(buffer)
      extractedText = parsed.extractedText
      pageCount = parsed.pageCount
    } catch (error) {
      parserError = error
      const reason = detectParserErrorReason(error, buffer)
      if (reason === "encrypted_pdf") {
        logPdfError(reason, file, buffer, error)
        return NextResponse.json({ detail: reason }, { status: 400 })
      }
    }

    if (!extractedText) {
      try {
        const parsed = await extractPdfTextWithPdfJs(buffer)
        extractedText = parsed.extractedText
        pageCount = Math.max(pageCount, parsed.pageCount)
      } catch (error) {
        parserError = parserError || error
        const reason = detectParserErrorReason(error, buffer)
        if (reason === "encrypted_pdf") {
          logPdfError(reason, file, buffer, error)
          return NextResponse.json({ detail: reason }, { status: 400 })
        }
      }
    }

    console.log("[PDF][PARSE]", {
      pageCount,
      extractedTextLength: extractedText.length,
      preview: extractedText.slice(0, 300),
    })

    if (!extractedText) {
      const reason: PdfErrorReason = mayBeEncryptedPdf(buffer)
        ? "encrypted_pdf"
        : pageCount > 0
          ? "image_only_pdf"
          : parserError
            ? "parser_exception"
            : "empty_text"

      logPdfError(reason, file, buffer, parserError)
      return NextResponse.json({ detail: reason }, { status: 400 })
    }

    return NextResponse.json({
      content: extractedText.substring(0, MAX_CONTENT_LENGTH),
    })
  } catch (error) {
    logPdfError("parser_exception", file, null, error)

    return NextResponse.json({ detail: "parser_exception" }, { status: 400 })
  }
}
