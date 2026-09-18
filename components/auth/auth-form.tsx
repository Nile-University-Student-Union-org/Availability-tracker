"use client";

import { useState } from "react";
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  // Signin Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

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
      const { error } = await authClient.signIn.email({
        email: trimmedEmail,
        password: loginPassword,
        callbackURL: resolvedCallback,
      });

      if (error) {
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
                  {COMMITTEES.map((c) => (
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
