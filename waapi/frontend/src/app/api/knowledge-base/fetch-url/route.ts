import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"

// POST — URL'den icerik cek ve metin cikar
export async function POST(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  const body = await request.json()

  if (!body.url) {
    return NextResponse.json({ detail: "URL zorunlu" }, { status: 400 })
  }

  try {
    const response = await fetch(body.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KnowledgeBot/1.0)",
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { detail: `URL fetch hatasi: ${response.status} ${response.statusText}` },
        { status: 400 }
      )
    }

    const html = await response.text()

    // Extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ""

    // Remove script and style tags with their content
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")

    // Strip remaining HTML tags
    text = text.replace(/<[^>]+>/g, " ")

    // Decode common HTML entities
    text = text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")

    // Collapse whitespace
    text = text.replace(/\s+/g, " ").trim()

    // Limit to 5000 characters
    const content = text.substring(0, 5000)

    return NextResponse.json({ title, content })
  } catch (err: any) {
    return NextResponse.json(
      { detail: `URL fetch hatasi: ${err.message}` },
      { status: 500 }
    )
  }
}
