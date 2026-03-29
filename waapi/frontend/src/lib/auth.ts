import { create } from "zustand"

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  org_id: string
  org_name: string
  org_slug: string
  org_plan: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  getToken: () => string | null
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: typeof window !== "undefined" ? localStorage.getItem("access_token") : null,
  refreshToken: typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem("access_token", accessToken)
    localStorage.setItem("refresh_token", refreshToken)
    set({ user, accessToken, refreshToken })
  },

  logout: () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    set({ user: null, accessToken: null, refreshToken: null })
  },

  getToken: () => get().accessToken,
}))
