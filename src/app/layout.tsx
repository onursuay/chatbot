import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "YoChat — WhatsApp Business Platform",
  description: "Yapay Zeka Destekli WhatsApp Business SaaS Platformu",
  icons: {
    icon: "/favicon.svg",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <script
          async
          defer
          crossOrigin="anonymous"
          src="https://connect.facebook.net/tr_TR/sdk.js#xfbml=1&version=v21.0&appId=4385939431652235"
        />
      </body>
    </html>
  )
}
