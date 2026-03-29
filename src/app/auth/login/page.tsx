"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useI18n } from "@/lib/i18n"

export default function LoginRedirect() {
  const router = useRouter()
  const { lang } = useI18n()

  useEffect(() => {
    router.replace(`/${lang}/login`)
  }, [router, lang])

  return null
}
