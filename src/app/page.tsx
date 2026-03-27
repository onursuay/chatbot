"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      router.push("/dashboard/inbox")
    } else {
      router.push("/auth/login")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="animate-pulse text-brand-400 text-xl">Yukleniyor...</div>
    </div>
  )
}
