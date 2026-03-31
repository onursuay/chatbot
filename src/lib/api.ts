interface FetchOptions extends RequestInit {
  token?: string
}

let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token")
  if (!refreshToken) return null

  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) return null

    const data = await res.json()
    localStorage.setItem("access_token", data.access_token)
    if (data.refresh_token) {
      localStorage.setItem("refresh_token", data.refresh_token)
    }
    return data.access_token
  } catch {
    return null
  }
}

export async function api<T = any>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders as Record<string, string>,
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`/api${path}`, { headers, ...rest })

  // Token expired — try refresh once
  if (res.status === 401 && token) {
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false
        refreshPromise = null
      })
    }

    const newToken = await (refreshPromise || refreshAccessToken())
    if (newToken) {
      // Update zustand store
      const { useAuth } = await import("@/lib/auth")
      useAuth.setState({ accessToken: newToken })

      // Retry with new token
      headers["Authorization"] = `Bearer ${newToken}`
      const retryRes = await fetch(`/api${path}`, { headers, ...rest })
      if (!retryRes.ok) {
        const error = await retryRes.json().catch(() => ({ detail: "Bir hata olustu" }))
        throw new Error(error.detail || `HTTP ${retryRes.status}`)
      }
      return retryRes.json()
    }

    // Refresh failed — redirect to login
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    window.location.href = "/tr/login"
    throw new Error("Oturum suresi doldu, giris sayfasina yonlendiriliyorsunuz")
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Bir hata olustu" }))
    throw new Error(error.detail || `HTTP ${res.status}`)
  }

  return res.json()
}
