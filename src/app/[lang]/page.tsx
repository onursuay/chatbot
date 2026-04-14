"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function LangIndex({ params }: { params: { lang: string } }) {
  const router = useRouter()
  useEffect(() => {
    router.replace(`/${params.lang}/panel`)
  }, [params.lang, router])
  return null
}
