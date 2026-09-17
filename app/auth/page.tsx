import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AuthForm } from "@/components/auth/auth-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { NusuLogo } from "@/components/nusu-logo"

import { getSafeCallbackUrl } from "@/lib/url-helpers"

export const metadata: Metadata = {
  title: "Member Access | Nile University Student Union",
  description:
    "Sign in or create a member account to mark your schedule availability.",
}

export default async function AuthPage(props: {
  searchParams: Promise<{ callbackUrl?: string; mode?: string }>
}) {
  const searchParams = await props.searchParams
  const callbackUrl = getSafeCallbackUrl(searchParams.callbackUrl, "/")
  const mode = searchParams.mode === "signup" ? "signup" : "signin"

  // If the user is already signed in, send them straight to their destination
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) {
    if (session.user.email === "admin@nu.edu.eg") {
      redirect("/admin")
    }
    redirect(callbackUrl)
  }

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {/* Warm glow behind content */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_70%_55%_at_50%_0%,oklch(0.60_0.155_52_/_0.09),transparent)] dark:[background:radial-gradient(ellipse_70%_55%_at_50%_0%,oklch(0.735_0.162_60_/_0.13),transparent)]" />

      <div className="relative flex w-full max-w-md flex-col items-center gap-8 px-6">
        {/* Logo with subtle halo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl" />
            <NusuLogo size="lg" className="relative drop-shadow-sm" />
          </div>

          <p className="text-xs text-muted-foreground sm:text-sm">
            Member Availability Tracker & Meeting Scheduler
          </p>
        </div>

        <div className="w-full rounded-3xl border bg-card/80 p-5 shadow-sm backdrop-blur-xs sm:p-7">
          <AuthForm initialMode={mode} callbackUrl={callbackUrl} />
        </div>
      </div>
    </main>
  )
}
