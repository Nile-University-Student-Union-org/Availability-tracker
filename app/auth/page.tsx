import type { Metadata } from "next"
import Image from "next/image";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Admin Sign In",
};

export default async function AuthPage(props: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const searchParams = await props.searchParams;
  const callbackUrl = searchParams.callbackUrl || "/admin";

  // If the user is already signed in, send them straight to the app
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect(callbackUrl);

  return (
    <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {/* Warm glow behind content */}
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_70%_55%_at_50%_0%,oklch(0.60_0.155_52_/_0.09),transparent)] dark:[background:radial-gradient(ellipse_70%_55%_at_50%_0%,oklch(0.735_0.162_60_/_0.13),transparent)]" />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-10 px-6">
        {/* Logo with subtle halo */}
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-primary/10 blur-2xl" />
            <Image
              src="/logo.svg"
              alt="SU Logo"
              width={76}
              height={99}
              priority
              className="relative drop-shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Admin Access
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in with your credentials to access the dashboard.
            </p>
          </div>
        </div>

        <div className="w-full">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
