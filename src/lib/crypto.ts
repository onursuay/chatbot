/**
 * Fernet-compatible decryption for Node.js (server-side only)
 * Backend encrypts WABA access_token with Python's cryptography.fernet.Fernet
 * This module decrypts them in Next.js API routes using the same ENCRYPTION_KEY
 */

import crypto from "crypto"

/**
 * Decrypt a Fernet-encrypted token.
 * Fernet token format (base64url): Version(1) || Timestamp(8) || IV(16) || Ciphertext(var) || HMAC(32)
 * Fernet key format (base64url): signing_key(16) || encryption_key(16)
 */
export function decryptToken(encryptedToken: string): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }

  // Decode Fernet key: base64url → 32 bytes (16 signing + 16 encryption)
  const keyBytes = Buffer.from(key, "base64url")
  if (keyBytes.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (base64url encoded)")
  }
  const signingKey = keyBytes.subarray(0, 16)
  const encryptionKey = keyBytes.subarray(16, 32)

  // Decode Fernet token
  const tokenBytes = Buffer.from(encryptedToken, "base64url")

  // Extract components
  const version = tokenBytes[0]
  if (version !== 0x80) {
    throw new Error("Invalid Fernet token version")
  }

  const iv = tokenBytes.subarray(9, 25) // 16 bytes IV
  const ciphertext = tokenBytes.subarray(25, tokenBytes.length - 32) // variable length
  const hmac = tokenBytes.subarray(tokenBytes.length - 32) // 32 bytes HMAC

  // Verify HMAC-SHA256
  const hmacInput = tokenBytes.subarray(0, tokenBytes.length - 32)
  const computedHmac = crypto.createHmac("sha256", signingKey).update(hmacInput).digest()

  if (!crypto.timingSafeEqual(computedHmac, hmac)) {
    throw new Error("Fernet token HMAC verification failed")
  }

  // Decrypt AES-128-CBC
  const decipher = crypto.createDecipheriv("aes-128-cbc", encryptionKey, iv)
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return decrypted.toString("utf-8")
}
