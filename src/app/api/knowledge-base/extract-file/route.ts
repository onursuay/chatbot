import { createRequire } from "node:module"
import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import { getServiceSupabase } from "@/lib/supabase"

export const runtime = "nodejs"
const require = createRequire(import.meta.url)

const MAX_CONTENT_LENGTH = 10000
const PDF_MAGIC_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]
const SUPPORTED_PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"])

type PdfErrorReason =
  | "invalid_mime"
  | "empty_buffer"
  | "download_invalid_content"
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

function getErrorName(error: unknown) {
  if (error instanceof Error) return error.name
  return "UnknownError"
}

function getErrorStack(error: unknown) {
  if (error instanceof Error) return error.stack
  return undefined
}

function getErrorCause(error: unknown) {
  if (error instanceof Error && "cause" in error) {
    return String((error as Error & { cause?: unknown }).cause)
  }
  return undefined
}

function getFirst16BytesHex(buffer: Uint8Array) {
  return Array.from(buffer.subarray(0, 16))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function buildPdfErrorBody(stage: string, reason: PdfErrorReason, error?: unknown) {
  return {
    stage,
    errorName: error ? getErrorName(error) : null,
    errorMessage: error ? getErrorMessage(error) : reason,
    reason,
  }
}

function logPdfError(
  reason: PdfErrorReason,
  file: { name: string; type: string; size: number },
  buffer: Uint8Array | null,
  error?: unknown,
  stage?: string
) {
  console.error("[PDF][ERROR]", {
    stage: stage || null,
    reason,
    filename: file.name,
    mimeType: file.type || null,
    size: file.size,
    byteLength: buffer?.byteLength ?? 0,
    name: error ? getErrorName(error) : undefined,
    message: error ? getErrorMessage(error) : undefined,
    stack: error ? getErrorStack(error) : undefined,
    cause: error ? getErrorCause(error) : undefined,
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

async function ensurePdfJsNodePolyfills() {
  const globalScope = globalThis as any

  if (typeof globalScope.DOMMatrix !== "undefined") {
    return
  }

  const { DOMMatrix } = require("@napi-rs/canvas/geometry")
  globalScope.DOMMatrix = DOMMatrix
}

async function extractPdfTextWithPdfJs(buffer: Uint8Array): Promise<PdfParseResult> {
  await ensurePdfJsNodePolyfills()
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

  const body = await request.json().catch(() => null)
  const bucket = typeof body?.bucket === "string" ? body.bucket : ""
  const filePath = typeof body?.filePath === "string" ? body.filePath : ""
  const fileName = typeof body?.fileName === "string" ? body.fileName : ""
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : ""

  if (!bucket || !filePath || !fileName) {
    return NextResponse.json({ detail: "Dosya referansi zorunlu" }, { status: 400 })
  }

  const ext = fileName.split(".").pop()?.toLowerCase()
  const file = { name: fileName, type: mimeType, size: 0 }

  try {
    console.log("[PDF][EXTRACT]", {
      filePath,
      bucket,
      fileName,
    })

    const supabase = getServiceSupabase()
    const { data: storedFile, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath)

    if (downloadError || !storedFile) {
      console.log("[PDF][DOWNLOAD]", {
        contentType: null,
        byteLength: 0,
        status: "error",
      })
      logPdfError("parser_exception", file, null, downloadError || new Error("storage_download_failed"), "download")
      return NextResponse.json(
        buildPdfErrorBody("download", "parser_exception", downloadError || new Error("storage_download_failed")),
        { status: 400 }
      )
    }

    const effectiveMimeType = storedFile.type || mimeType || ""
    file.type = effectiveMimeType
    file.size = storedFile.size || 0
    console.log("[PDF][UPLOAD]", {
      filename: fileName,
      mimeType: effectiveMimeType || null,
      size: storedFile.size,
    })

    const buffer = new Uint8Array(await storedFile.arrayBuffer())
    file.size = storedFile.size || buffer.byteLength

    console.log("[PDF][DOWNLOAD]", {
      status: "ok",
      contentType: effectiveMimeType || null,
      byteLength: buffer.byteLength,
    })

    console.log("[PDF][BUFFER]", {
      first16BytesHex: getFirst16BytesHex(buffer),
      byteLength: buffer.byteLength,
    })

    if (ext !== "pdf" || !isPdfMimeType(mimeType)) {
      logPdfError("invalid_mime", file, buffer, undefined, "input_validation")
      return NextResponse.json(buildPdfErrorBody("input_validation", "invalid_mime"), { status: 400 })
    }

    if (!buffer.byteLength) {
      logPdfError("empty_buffer", file, buffer, undefined, "buffer")
      return NextResponse.json(buildPdfErrorBody("buffer", "empty_buffer"), { status: 400 })
    }

    if ((effectiveMimeType && !isPdfMimeType(effectiveMimeType)) || !hasPdfHeader(buffer)) {
      const invalidContentError = new Error("downloaded_content_is_not_a_valid_pdf")
      logPdfError("download_invalid_content", file, buffer, invalidContentError, "download_validation")
      return NextResponse.json(
        buildPdfErrorBody("download_validation", "download_invalid_content", invalidContentError),
        { status: 400 }
      )
    }

    let extractedText = ""
    let pageCount = 0
    let parserError: unknown = null

    try {
      const parsed = await extractPdfTextWithPdfParse(buffer)
      extractedText = parsed.extractedText
      pageCount = parsed.pageCount
      console.log("[PDF][PARSE]", {
        parserName: "pdf-parse",
        pageCount,
        extractedTextLength: extractedText.length,
      })
    } catch (error) {
      parserError = error
      const reason = detectParserErrorReason(error, buffer)
      logPdfError(reason, file, buffer, error, "pdf-parse")
      if (reason === "encrypted_pdf") {
        return NextResponse.json(buildPdfErrorBody("pdf-parse", reason, error), { status: 400 })
      }
    }

    if (!extractedText) {
      try {
        const parsed = await extractPdfTextWithPdfJs(buffer)
        extractedText = parsed.extractedText
        pageCount = Math.max(pageCount, parsed.pageCount)
        console.log("[PDF][PARSE]", {
          parserName: "pdfjs-dist",
          pageCount,
          extractedTextLength: extractedText.length,
        })
      } catch (error) {
        parserError = parserError || error
        const reason = detectParserErrorReason(error, buffer)
        logPdfError(reason, file, buffer, error, "pdfjs-dist")
        if (reason === "encrypted_pdf") {
          return NextResponse.json(buildPdfErrorBody("pdfjs-dist", reason, error), { status: 400 })
        }
      }
    }

    if (!extractedText) {
      const reason: PdfErrorReason = mayBeEncryptedPdf(buffer)
        ? "encrypted_pdf"
        : pageCount > 0
          ? "image_only_pdf"
          : parserError
            ? "parser_exception"
            : "empty_text"

      logPdfError(reason, file, buffer, parserError, "finalize")
      return NextResponse.json(buildPdfErrorBody("finalize", reason, parserError), { status: 400 })
    }

    return NextResponse.json({
      content: extractedText.substring(0, MAX_CONTENT_LENGTH),
    })
  } catch (error) {
    logPdfError("parser_exception", file, null, error, "request")
    return NextResponse.json(buildPdfErrorBody("request", "parser_exception", error), { status: 400 })
  }
}
