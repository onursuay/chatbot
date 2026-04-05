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

  // Inline minimal DOMMatrix polyfill — no native dependencies needed
  class DOMMatrix {
    a: number; b: number; c: number; d: number; e: number; f: number
    m11: number; m12: number; m13: number; m14: number
    m21: number; m22: number; m23: number; m24: number
    m31: number; m32: number; m33: number; m34: number
    m41: number; m42: number; m43: number; m44: number
    is2D: boolean; isIdentity: boolean

    constructor(init?: string | number[]) {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0
      this.m11 = 1; this.m12 = 0; this.m13 = 0; this.m14 = 0
      this.m21 = 0; this.m22 = 1; this.m23 = 0; this.m24 = 0
      this.m31 = 0; this.m32 = 0; this.m33 = 1; this.m34 = 0
      this.m41 = 0; this.m42 = 0; this.m43 = 0; this.m44 = 1
      this.is2D = true; this.isIdentity = true

      if (Array.isArray(init)) {
        if (init.length === 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init
          this.m11 = init[0]; this.m12 = init[1]
          this.m21 = init[2]; this.m22 = init[3]
          this.m41 = init[4]; this.m42 = init[5]
        } else if (init.length === 16) {
          [
            this.m11, this.m12, this.m13, this.m14,
            this.m21, this.m22, this.m23, this.m24,
            this.m31, this.m32, this.m33, this.m34,
            this.m41, this.m42, this.m43, this.m44,
          ] = init
          this.a = this.m11; this.b = this.m12
          this.c = this.m21; this.d = this.m22
          this.e = this.m41; this.f = this.m42
          this.is2D = false
        }
        this.isIdentity =
          this.m11 === 1 && this.m12 === 0 && this.m13 === 0 && this.m14 === 0 &&
          this.m21 === 0 && this.m22 === 1 && this.m23 === 0 && this.m24 === 0 &&
          this.m31 === 0 && this.m32 === 0 && this.m33 === 1 && this.m34 === 0 &&
          this.m41 === 0 && this.m42 === 0 && this.m43 === 0 && this.m44 === 1
      }
    }

    multiply(other: DOMMatrix): DOMMatrix {
      const result = new DOMMatrix()
      result.m11 = this.m11 * other.m11 + this.m12 * other.m21 + this.m13 * other.m31 + this.m14 * other.m41
      result.m12 = this.m11 * other.m12 + this.m12 * other.m22 + this.m13 * other.m32 + this.m14 * other.m42
      result.m21 = this.m21 * other.m11 + this.m22 * other.m21 + this.m23 * other.m31 + this.m24 * other.m41
      result.m22 = this.m21 * other.m12 + this.m22 * other.m22 + this.m23 * other.m32 + this.m24 * other.m42
      result.m41 = this.m41 * other.m11 + this.m42 * other.m21 + this.m43 * other.m31 + this.m44 * other.m41
      result.m42 = this.m41 * other.m12 + this.m42 * other.m22 + this.m43 * other.m32 + this.m44 * other.m42
      result.a = result.m11; result.b = result.m12
      result.c = result.m21; result.d = result.m22
      result.e = result.m41; result.f = result.m42
      return result
    }

    translate(tx = 0, ty = 0, tz = 0): DOMMatrix {
      const m = new DOMMatrix()
      m.m41 = tx; m.m42 = ty; m.m43 = tz
      m.e = tx; m.f = ty
      return this.multiply(m)
    }

    scale(sx = 1, sy = sx, sz = 1, ox = 0, oy = 0, oz = 0): DOMMatrix {
      const m = new DOMMatrix()
      m.m11 = sx; m.m22 = sy; m.m33 = sz
      m.a = sx; m.d = sy
      return this.translate(ox, oy, oz).multiply(m).translate(-ox, -oy, -oz)
    }

    transformPoint(point: { x?: number; y?: number; z?: number; w?: number } = {}) {
      const x = point.x ?? 0, y = point.y ?? 0, z = point.z ?? 0, w = point.w ?? 1
      return {
        x: this.m11 * x + this.m21 * y + this.m31 * z + this.m41 * w,
        y: this.m12 * x + this.m22 * y + this.m32 * z + this.m42 * w,
        z: this.m13 * x + this.m23 * y + this.m33 * z + this.m43 * w,
        w: this.m14 * x + this.m24 * y + this.m34 * z + this.m44 * w,
      }
    }

    inverse(): DOMMatrix { return new DOMMatrix() }
    flipX(): DOMMatrix { return new DOMMatrix([-1, 0, 0, 1, 0, 0]) }
    flipY(): DOMMatrix { return new DOMMatrix([1, 0, 0, -1, 0, 0]) }
    toString(): string { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})` }

    static fromMatrix(init: Partial<DOMMatrix> = {}): DOMMatrix {
      const m = new DOMMatrix()
      Object.assign(m, init)
      return m
    }

    static fromFloat32Array(arr: Float32Array): DOMMatrix {
      return new DOMMatrix(Array.from(arr))
    }

    static fromFloat64Array(arr: Float64Array): DOMMatrix {
      return new DOMMatrix(Array.from(arr))
    }
  }

  globalScope.DOMMatrix = DOMMatrix
}

async function extractPdfTextWithPdfJs(buffer: Uint8Array): Promise<PdfParseResult> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs")
  // Server-side'da worker yok — fake worker kullan
  pdfjsLib.GlobalWorkerOptions.workerSrc = ""
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

    // Polyfill'i her iki parser'dan önce kur
    await ensurePdfJsNodePolyfills()

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
