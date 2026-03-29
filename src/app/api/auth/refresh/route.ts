import { NextResponse } from "next/server"
import { verifyToken, createAccessToken } from "@/lib/jwt"

export async function POST(request: Request) {
  try {
    const { refresh_token } = await request.json()

    if (!refresh_token) {
      return NextResponse.json({ detail: "Refresh token zorunlu" }, { status: 400 })
    }

    const payload = await verifyToken(refresh_token)
    if (!payload || payload.type !== "refresh") {
      return NextResponse.json({ detail: "Gecersiz refresh token" }, { status: 401 })
    }

    const newAccessToken = await createAccessToken({
      sub: payload.sub,
      org_id: payload.org_id,
      role: payload.role,
      email: payload.email,
    })

    return NextResponse.json({
      access_token: newAccessToken,
      refresh_token,
      token_type: "bearer",
    })
  } catch {
    return NextResponse.json({ detail: "Token yenileme hatasi" }, { status: 500 })
  }
}
