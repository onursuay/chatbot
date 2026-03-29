import { SignJWT, jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "change-me-jwt-secret")

export interface JWTPayload {
  sub: string
  org_id: string
  role: string
  email: string
  type?: string
}

export async function createAccessToken(payload: Omit<JWTPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30m")
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function createRefreshToken(payload: Omit<JWTPayload, "type">): Promise<string> {
  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getAuthUser(request: Request): Promise<JWTPayload | null> {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.slice(7)
  const payload = await verifyToken(token)
  if (!payload || payload.type !== "access") return null

  return payload
}
