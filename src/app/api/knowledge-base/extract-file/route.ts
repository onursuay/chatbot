import { NextResponse } from "next/server"
import { PDFParse } from "pdf-parse"
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

export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "Dosya zorunlu" }, { status: 400 })
  }

  const ext = file.name.split(".").pop()?.toLowerCase()
  if (ext !== "pdf") {
    return NextResponse.json({ detail: "Sadece PDF destekleniyor" }, { status: 400 })
  }

  const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) })

  try {
    const result = await parser.getText()
    const content = normalizeExtractedText(result.text || "")

    if (!content) {
      return NextResponse.json(
        { detail: "PDF icinde okunabilir metin bulunamadi" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      content: content.substring(0, MAX_CONTENT_LENGTH),
    })
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "PDF icerigi okunamadi" },
      { status: 500 }
    )
  } finally {
    await parser.destroy().catch(() => undefined)
  }
}
