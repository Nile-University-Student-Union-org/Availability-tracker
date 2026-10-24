"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/notify";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ViewIcon,
  ViewOffIcon,
  Mail01Icon,
  LockPasswordIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Shield01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

import { getSafeCallbackUrl } from "@/lib/url-helpers";

interface AuthFormProps {
  callbackUrl?: string;
}

export function AuthForm({ callbackUrl }: AuthFormProps) {
  const searchParams = useSearchParams();
  const resolvedCallback = getSafeCallbackUrl(
    callbackUrl || searchParams.get("callbackUrl"),
    "/",
  );

  const authError = searchParams.get("error");
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);
  const [microsoftLoading, setMicrosoftLoading] = useState(false);

  // Signin Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Reset Password Intercept State
  const [resetMode, setResetMode] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] =
    useState(false);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Signin Validation & Submission
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail || !loginPassword) {
      toast.error("Please enter both email and password.");
      return;
    }

    try {
      setLoginLoading(true);

      // Check if this member is flagged for a mandatory administrative password reset
      try {
        const checkRes = await fetch(
          `/api/auth/reset-first-login?email=${encodeURIComponent(trimmedEmail)}`,
        );
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.mustResetPassword) {
            setResetMode(true);
            toast.info(
              "An administrator has reset your password. Please choose a new password below.",
            );
            return;
          }
        }
      } catch {
        // Fallback to standard sign in if check endpoint is unreachable
      }

      const { error } = await authClient.signIn.email({
        email: trimmedEmail,
        password: loginPassword,
        callbackURL: resolvedCallback,
      });

      if (error) {
        // Also check if invalid credentials was due to a pending reset
        try {
          const checkRes = await fetch(
            `/api/auth/reset-first-login?email=${encodeURIComponent(trimmedEmail)}`,
          );
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.mustResetPassword) {
              setResetMode(true);
              toast.info(
                "An administrator has reset your password. Please set a new password below.",
              );
              return;
            }
          }
        } catch {
          // Ignore
        }

        toast.error(error.message || "Invalid credentials. Please try again.");
        return;
      }

      toast.success("Signed in successfully!");
      if (trimmedEmail === "admin@nu.edu.eg") {
        window.location.href = "/admin";
      } else {
        window.location.href = resolvedCallback;
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(`Error: ${msg}`);
    } finally {
      setLoginLoading(false);
    }
  }

  // Handle Forced Password Reset Submission
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = loginEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      toast.error("Please enter your university email.");
      setResetMode(false);
      return;
    }

    if (!resetNewPassword || resetNewPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setResetSubmitting(true);

      const res = await fetch("/api/auth/reset-first-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          newPassword: resetNewPassword,
          confirmPassword: resetConfirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      // Automatically sign in with the new password
      const { error: signInError } = await authClient.signIn.email({
        email: trimmedEmail,
        password: resetNewPassword,
        callbackURL: resolvedCallback,
      });

      if (signInError) {
        toast.success(
          "Password updated! Please sign in with your new password.",
        );
        setResetMode(false);
        setLoginPassword(resetNewPassword);
        return;
      }

      // Set session storage flag to trigger confirmation banner on dashboard
      sessionStorage.setItem("nusu_password_reset_success", "true");
      toast.success(
        "Password has been reset successfully! Welcome back to NUSU.",
      );

      if (trimmedEmail === "admin@nu.edu.eg") {
        window.location.href = "/admin";
      } else {
        window.location.href = resolvedCallback;
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to reset password.";
      toast.error(msg);
    } finally {
      setResetSubmitting(false);
    }
  }

  async function handleMicrosoft() {
    setMicrosoftLoading(true);
    const { error } = await authClient.signIn.social({
      provider: "microsoft",
      callbackURL: resolvedCallback,
      errorCallbackURL: "/auth",
    });
    if (error) {
      setMicrosoftLoading(false);
      toast.error(
        error.message || "Microsoft sign-in failed. Please try again.",
      );
    }
  }

  if (!showPasswordLogin) {
    return (
      <div className="w-full space-y-5">
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-lg font-bold tracking-tight">
            Sign in
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Use your Nile University Microsoft account (@nu.edu.eg).
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive"
          >
            Sign-in didn&apos;t complete. Only @nu.edu.eg Microsoft accounts can
            sign in. If you saw &ldquo;Need admin approval&rdquo;, the
            university needs to approve this app first.
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleMicrosoft}
          disabled={microsoftLoading}
          className="min-h-[48px] w-full cursor-pointer touch-manipulation gap-3 rounded-xl font-semibold active:scale-[0.98]"
        >
          <svg aria-hidden viewBox="0 0 21 21" className="size-[18px]">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          {microsoftLoading ? "Redirecting..." : "Sign in with Microsoft"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Union administrator?{" "}
          <button
            type="button"
            onClick={() => setShowPasswordLogin(true)}
            className="inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign in with password
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <button
        type="button"
        onClick={() => setShowPasswordLogin(false)}
        className="inline-flex min-h-[44px] cursor-pointer touch-manipulation items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
        Back to Microsoft sign-in
      </button>
      {resetMode ? (
        /* RESET PASSWORD FORM (Admin Triggered) */
        <form onSubmit={handleResetSubmit} className="space-y-4">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-left backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30">
                <HugeiconsIcon icon={Shield01Icon} className="size-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">
                  Password Reset Required
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  An administrator has reset your password for{" "}
                  <span className="font-semibold text-foreground">
                    {loginEmail}
                  </span>
                  . The previous password is no longer valid. Please choose a
                  new password to continue.
                </p>
              </div>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reset-new-password" className="text-xs font-medium">
              New Password
            </Label>
            <div className="relative">
              <HugeiconsIcon
                icon={LockPasswordIcon}
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="reset-new-password"
                type={showResetNewPassword ? "text" : "password"}
                placeholder="Enter at least 8 characters"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
                required
                className="min-h-[44px] rounded-xl pr-10 pl-9"
              />
              <button
                type="button"
                onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer touch-manipulation text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={showResetNewPassword ? ViewOffIcon : ViewIcon}
                  className="size-4"
                />
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="reset-confirm-password"
              className="text-xs font-medium"
            >
              Confirm New Password
            </Label>
            <div className="relative">
              <HugeiconsIcon
                icon={LockPasswordIcon}
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="reset-confirm-password"
                type={showResetConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your new password"
                value={resetConfirmPassword}
                onChange={(e) => setResetConfirmPassword(e.target.value)}
                required
                className="min-h-[44px] rounded-xl pr-10 pl-9"
              />
              <button
                type="button"
                onClick={() =>
                  setShowResetConfirmPassword(!showResetConfirmPassword)
                }
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer touch-manipulation text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={showResetConfirmPassword ? ViewOffIcon : ViewIcon}
                  className="size-4"
                />
              </button>
            </div>
          </div>

          {/* Password Validation Requirements Indicator */}
          <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1.5 border border-border/50">
            <p className="font-medium text-foreground/80">
              Password requirements:
            </p>
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className={cn(
                  "size-3.5 transition-colors",
                  resetNewPassword.length >= 8
                    ? "text-emerald-500"
                    : "text-muted-foreground/40",
                )}
              />
              <span
                className={
                  resetNewPassword.length >= 8
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-muted-foreground"
                }
              >
                Minimum 8 characters
              </span>
            </div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                icon={CheckmarkCircle02Icon}
                className={cn(
                  "size-3.5 transition-colors",
                  resetNewPassword.length >= 8 &&
                    resetNewPassword === resetConfirmPassword
                    ? "text-emerald-500"
                    : "text-muted-foreground/40",
                )}
              />
              <span
                className={
                  resetNewPassword.length >= 8 &&
                  resetNewPassword === resetConfirmPassword
                    ? "text-emerald-600 dark:text-emerald-400 font-medium"
                    : "text-muted-foreground"
                }
              >
                Passwords match
              </span>
            </div>
          </div>

          <Button
            type="submit"
            className="min-h-[46px] w-full cursor-pointer touch-manipulation rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-[0.98]"
            size="lg"
            disabled={
              resetSubmitting ||
              resetNewPassword.length < 8 ||
              resetNewPassword !== resetConfirmPassword
            }
          >
            {resetSubmitting ? (
              "Updating & Signing In..."
            ) : (
              <span className="flex items-center gap-2">
                Set New Password & Sign In
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </span>
            )}
          </Button>

          <button
            type="button"
            onClick={() => {
              setResetMode(false);
              setResetNewPassword("");
              setResetConfirmPassword("");
            }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline cursor-pointer py-1"
          >
            Cancel and return to standard sign in
          </button>
        </form>
      ) : (
        /* SIGN IN FORM */
        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email" className="text-xs font-medium">
              University Email
            </Label>
            <div className="relative">
              <HugeiconsIcon
                icon={Mail01Icon}
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="login-email"
                type="email"
                placeholder="username@nu.edu.eg"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                className="min-h-[44px] rounded-xl pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="login-password" className="text-xs font-medium">
              Password
            </Label>
            <div className="relative">
              <HugeiconsIcon
                icon={LockPasswordIcon}
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="login-password"
                type={showLoginPassword ? "text" : "password"}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="min-h-[44px] rounded-xl pr-10 pl-9"
              />
              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer touch-manipulation text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={showLoginPassword ? ViewOffIcon : ViewIcon}
                  className="size-4"
                />
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="min-h-[46px] w-full cursor-pointer touch-manipulation rounded-xl font-semibold active:scale-[0.98]"
            size="lg"
            disabled={loginLoading}
          >
            {loginLoading ? (
              "Signing in..."
            ) : (
              <span className="flex items-center gap-2">
                Sign In
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </span>
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
