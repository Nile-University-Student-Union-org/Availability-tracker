import type { Metadata } from "next"
import { Poppins } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

// Poppins — brand body font (Poppins in the SU brand guidelines)
const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: {
    template: "%s | SU Availability Tracker",
    default: "SU Availability Tracker",
  },
  description:
    "Mark your availability for the week of Apr 19–23, 2026. Select your free time slots so the team can find the best meeting time.",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", poppins.variable)}
    >
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
