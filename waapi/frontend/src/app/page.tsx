"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      router.push("/tr/gelen-kutusu")
    }
    // Unauthenticated users see the landing page via middleware rewrite
  }, [router])

  return null
}
