"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      router.push("/tr/gelen-kutusu")
    } else {
      router.push("/auth/login")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <img
          src="/logo.png"
          alt="YoAi"
          className="h-14 w-auto"
          style={{
            animation: "float-logo 2s ease-in-out infinite",
          }}
        />
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-primary"
              style={{
                animation: "bounce-dot 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
        <span className="text-sm text-ink-tertiary">Yükleniyor...</span>
        <style>{`
          @keyframes bounce-dot {
            0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
            40% { transform: scale(1); opacity: 1; }
          }
          @keyframes float-logo {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
      </div>
    </div>
  )
}
