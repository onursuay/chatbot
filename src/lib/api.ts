interface FetchOptions extends RequestInit {
  token?: string
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

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Bir hata olustu" }))
    throw new Error(error.detail || `HTTP ${res.status}`)
  }

  return res.json()
}
