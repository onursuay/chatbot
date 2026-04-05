import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/jwt"
import crypto from "crypto"

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || process.env.META_APP_ID || ""
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || ""

const SCOPES = [
  "business_management",
  "pages_show_list",
  "pages_messaging",
  "pages_manage_metadata",
  "instagram_basic",
  "instagram_manage_messages",
  "whatsapp_business_management",
  "whatsapp_business_messaging",
].join(",")

// GET — Start Meta OAuth flow
export async function GET(request: Request) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ detail: "Yetkisiz" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const lang = searchParams.get("lang") || "tr"
    const state = crypto.randomBytes(32).toString("hex")

    const params = new URLSearchParams({
      client_id: META_APP_ID,
      redirect_uri: META_REDIRECT_URI,
      scope: SCOPES,
      response_type: "code",
      state,
    })

    const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`

    const response = NextResponse.json({ url: oauthUrl })

    // Store state for CSRF validation
    response.cookies.set("meta_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    })

    // Store org_id so callback can identify the user
    response.cookies.set("meta_oauth_org_id", auth.org_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    })

    // Store lang so callback can redirect to correct language
    response.cookies.set("meta_oauth_lang", lang, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    })

    return response
  } catch (e: any) {
    console.error("Meta OAuth connect error:", e)
    return NextResponse.json(
      { detail: e.message || "OAuth baslatilamadi" },
      { status: 500 }
    )
  }
}
