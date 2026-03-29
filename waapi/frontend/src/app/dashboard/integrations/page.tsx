"use client"

// Dashboard integrations sayfası ana lokalize versiyona yönlendirir
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/lib/i18n"

export default function IntegrationsRedirect() {
  const router = useRouter()
  const { lang } = useI18n()

  useEffect(() => {
    router.replace(`/${lang || "tr"}/integrations`)
  }, [router, lang])

  return null
}
