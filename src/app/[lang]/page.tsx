"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LangIndex({ params }: { params: { lang: string } }) {
  const router = useRouter()
  useEffect(() => {
    if (params.lang === "en") {
      router.replace("/en/inbox")
    } else {
      router.replace("/tr/gelen-kutusu")
    }
  }, [params.lang, router])
  return null
}
