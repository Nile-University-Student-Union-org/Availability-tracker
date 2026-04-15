import Image from "next/image";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default async function AuthPage() {
  // If the user is already signed in, send them straight to the app
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");

  return (
    <main className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 px-6">
        {/* Logo / heading */}
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo.svg"
            alt="SU Logo"
            width={72}
            height={94}
            priority
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            SU Availability Tracker
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to mark your free time slots for the week.
          </p>
        </div>

        {/* Google sign-in */}
        <GoogleSignInButton />
      </div>
    </main>
  );
}
