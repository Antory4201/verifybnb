import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BNB Verify - Secure your assets with BNB",
  description: "Verify and secure your BEP-20 assets on BNB Smart Chain",
  icons: {
    icon: [
      { url: "/bnb-logo.png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/bnb-logo.png",
    shortcut: "/bnb-logo.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    images: ["/bnb-logo.png"],
  },
  themeColor: "#F0B90B",
  viewport: "width=device-width,initial-scale=1",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
