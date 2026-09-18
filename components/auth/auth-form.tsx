"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { COMMITTEES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ViewIcon,
  ViewOffIcon,
  UserIcon,
  Mail01Icon,
  LockPasswordIcon,
  IdentificationIcon,
  ArrowRight01Icon,
  Login01Icon,
  Shield01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

import { getSafeCallbackUrl } from "@/lib/url-helpers";

interface AuthFormProps {
  initialMode?: "signup" | "signin";
  callbackUrl?: string;
}

export function AuthForm({ initialMode, callbackUrl }: AuthFormProps) {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const defaultMode =
    initialMode ?? (modeParam === "signup" ? "signup" : "signin");

  const [activeTab, setActiveTab] = useState<"signup" | "signin">(defaultMode);
  const resolvedCallback = getSafeCallbackUrl(
    callbackUrl || searchParams.get("callbackUrl"),
    "/",
  );

  // Signup Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nuId, setNuId] = useState("");
  const [committee, setCommittee] = useState("");
  const [availableCommittees, setAvailableCommittees] =
    useState<string[]>(COMMITTEES);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/committees")
      .then((r) => r.json())
      .then((d) => {
        if (
          !cancelled &&
          Array.isArray(d?.committees) &&
          d.committees.length > 0
        ) {
          setAvailableCommittees(d.committees);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Signup Validation & Submission
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedId = nuId.trim();

    if (!trimmedName) {
      toast.error("Please enter your full name.");
      return;
    }

    if (!trimmedEmail) {
      toast.error("Please enter your email.");
      return;
    }

    if (!trimmedEmail.endsWith("@nu.edu.eg")) {
      toast.error("Only official @nu.edu.eg emails are allowed.");
      return;
    }

    if (!trimmedId) {
      toast.error("Please enter your NU ID.");
      return;
    }

    if (!/^\d{9}$/.test(trimmedId)) {
      toast.error("NU ID must be exactly 9 digits.");
      return;
    }

    if (!committee) {
      toast.error("Please select your Union committee.");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setSignupLoading(true);
      const { error } = await authClient.signUp.email({
        name: trimmedName,
        email: trimmedEmail,
        password,
        nuId: trimmedId,
        committee,
        callbackURL: resolvedCallback,
      });

      if (error) {
        toast.error(
          error.message || "Failed to create account. Please try again.",
        );
        return;
      }

      toast.success("Account created successfully! Welcome to NUSU.");
      window.location.href = resolvedCallback;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(`Error: ${msg}`);
    } finally {
      setSignupLoading(false);
    }
  }

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

  return (
    <div className="w-full space-y-6">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 rounded-2xl bg-muted/70 p-1 ring-1 ring-border/50">
        <button
          type="button"
          onClick={() => setActiveTab("signup")}
          className={cn(
            "flex min-h-[44px] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] sm:text-sm",
            activeTab === "signup"
              ? "bg-card text-foreground shadow-xs ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <HugeiconsIcon icon={UserIcon} className="size-4" />
          Create Account
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("signin")}
          className={cn(
            "flex min-h-[44px] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] sm:text-sm",
            activeTab === "signin"
              ? "bg-card text-foreground shadow-xs ring-1 ring-border/50"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <HugeiconsIcon icon={Login01Icon} className="size-4" />
          Sign In
        </button>
      </div>

      {/* SIGN UP FORM */}
      {activeTab === "signup" ? (
        <form onSubmit={handleSignUp} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="signup-name" className="text-xs font-medium">
              Full Name
            </Label>
            <div className="relative">
              <HugeiconsIcon
                icon={UserIcon}
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="signup-name"
                type="text"
                placeholder="Ahmed Mahmoud"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="min-h-[44px] rounded-xl pl-9"
              />
            </div>
          </div>

          {/* NU Email */}
          <div className="space-y-1.5">
            <Label htmlFor="signup-email" className="text-xs font-medium">
              University Email
            </Label>
            <div className="relative">
              <HugeiconsIcon
                icon={Mail01Icon}
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="signup-email"
                type="email"
                placeholder="username@nu.edu.eg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="min-h-[44px] rounded-xl pl-9"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Must end with{" "}
              <span className="font-mono font-medium">@nu.edu.eg</span>
            </p>
          </div>

          {/* NU ID (9 digits) & Committee side-by-side or stacked on mobile */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* NU ID */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-nuid" className="text-xs font-medium">
                NU ID (9 Digits)
              </Label>
              <div className="relative">
                <HugeiconsIcon
                  icon={IdentificationIcon}
                  className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="signup-nuid"
                  type="text"
                  maxLength={9}
                  placeholder="211100000"
                  value={nuId}
                  onChange={(e) => setNuId(e.target.value.replace(/\D/g, ""))}
                  required
                  className="min-h-[44px] rounded-xl pl-9 font-mono"
                />
              </div>
            </div>

            {/* Committee */}
            <div className="space-y-1.5">
              <Label htmlFor="signup-committee" className="text-xs font-medium">
                Committee
              </Label>
              <Select
                value={committee}
                onValueChange={(val) => setCommittee(val ?? "")}
              >
                <SelectTrigger
                  id="signup-committee"
                  className="min-h-[44px] rounded-xl"
                >
                  <SelectValue placeholder="Select committee" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableCommittees.map((c) => (
                    <SelectItem key={c} value={c} className="rounded-lg">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="signup-password" className="text-xs font-medium">
              Password
            </Label>
            <div className="relative">
              <HugeiconsIcon
                icon={LockPasswordIcon}
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="min-h-[44px] rounded-xl pr-10 pl-9"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 touch-manipulation text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={showPassword ? ViewOffIcon : ViewIcon}
                  className="size-4"
                />
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="signup-confirm-password"
              className="text-xs font-medium"
            >
              Confirm Password
            </Label>
            <div className="relative">
              <HugeiconsIcon
                icon={LockPasswordIcon}
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="signup-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="min-h-[44px] rounded-xl pr-10 pl-9"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute top-1/2 right-3 -translate-y-1/2 touch-manipulation text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon
                  icon={showConfirmPassword ? ViewOffIcon : ViewIcon}
                  className="size-4"
                />
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="min-h-[46px] w-full cursor-pointer touch-manipulation rounded-xl font-semibold active:scale-[0.98]"
            size="lg"
            disabled={signupLoading}
          >
            {signupLoading ? (
              "Creating account..."
            ) : (
              <span className="flex items-center gap-2">
                Create Account
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </span>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Already registered?{" "}
            <button
              type="button"
              onClick={() => setActiveTab("signin")}
              className="font-semibold text-primary underline-offset-4 hover:underline cursor-pointer"
            >
              Sign In here
            </button>
          </p>
        </form>
      ) : resetMode ? (
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

          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account yet?{" "}
            <button
              type="button"
              onClick={() => setActiveTab("signup")}
              className="font-semibold text-primary underline-offset-4 hover:underline cursor-pointer"
            >
              Sign Up now
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
