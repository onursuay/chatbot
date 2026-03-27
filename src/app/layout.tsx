import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "WaAPI — WhatsApp Business Platform",
  description: "Yapay Zeka Destekli WhatsApp Business SaaS Platformu",
  icons: {
    icon: "/favicon.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body>{children}</body>
    </html>
  )
}
