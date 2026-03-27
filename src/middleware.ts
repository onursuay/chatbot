import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// TR slug -> EN slug (canonical page path)
const TR_TO_EN: Record<string, string> = {
  "gelen-kutusu": "inbox",
  "kisiler": "contacts",
  "sablonlar": "templates",
  "toplu-mesaj": "broadcast",
  "sohbet-botu": "chatbot",
  "otomasyon": "automation",
  "akis-olusturucu": "flow-builder",
  "kanallar": "channels",
  "entegrasyonlar": "integrations",
  "raporlar": "analytics",
  "abonelik": "billing",
  "ayarlar": "settings",
}

const SUPPORTED_LANGS = ["tr", "en"]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes, static files, auth pages — dokunma
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/auth/")
  ) {
    return NextResponse.next()
  }

  // Root "/" -> /tr (default dil)
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/tr/gelen-kutusu", request.url))
  }

  // Eski /dashboard/* URL'leri -> /tr/* yönlendir
  if (pathname.startsWith("/dashboard/")) {
    const slug = pathname.replace("/dashboard/", "")
    // EN slug'ı TR'ye çevir
    const trSlug = Object.entries(TR_TO_EN).find(([, en]) => en === slug)?.[0] || slug
    return NextResponse.redirect(new URL(`/tr/${trSlug}`, request.url))
  }
  if (pathname === "/dashboard") {
    return NextResponse.redirect(new URL("/tr/gelen-kutusu", request.url))
  }

  // /tr veya /en (dil root) -> inbox'a yönlendir
  if (pathname === "/tr") {
    return NextResponse.redirect(new URL("/tr/gelen-kutusu", request.url))
  }
  if (pathname === "/en") {
    return NextResponse.redirect(new URL("/en/inbox", request.url))
  }

  // /tr/otomasyon veya /en/automation -> iç rewrite
  const parts = pathname.split("/").filter(Boolean)
  if (parts.length >= 2 && SUPPORTED_LANGS.includes(parts[0])) {
    const lang = parts[0]
    const slug = parts[1]

    // TR slug ise EN'ye çevir (sayfa dosyaları EN slug ile)
    const enSlug = lang === "tr" ? (TR_TO_EN[slug] || slug) : slug

    // Rewrite: /tr/otomasyon -> /[lang]/automation (iç sayfa yolu)
    const url = request.nextUrl.clone()
    url.pathname = `/${lang}/${enSlug}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.svg|favicon\\.ico).*)",
  ],
}
