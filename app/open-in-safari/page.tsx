"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FALLBACK_URL = "https://availability-tracker.vercel.app";

function getSafeTarget(target: string | null) {
  if (!target) return FALLBACK_URL;
  try {
    const url = new URL(target);
    if (url.protocol !== "https:") return FALLBACK_URL;
    return url.toString();
  } catch {
    return FALLBACK_URL;
  }
}

export default function OpenInSafariPage() {
  const [reason, setReason] = useState<string | null>(null);
  const [rawTarget, setRawTarget] = useState<string | null>(null);
  const [autoTried, setAutoTried] = useState(false);
  const target = useMemo(() => getSafeTarget(rawTarget), [rawTarget]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReason(params.get("reason"));
    setRawTarget(params.get("target"));
  }, []);

  useEffect(() => {
    if (autoTried) return;
    setAutoTried(true);

    // Attempt immediate handoff; some webviews may keep users in-app, so fallbacks remain visible.
    window.location.assign(target);
  }, [autoTried, target]);

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(target);
      toast.success("Link copied. Open Safari and paste it.");
    } catch {
      toast.error("Couldn't copy the link. Please copy it manually.");
    }
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Open in Safari</h1>
        <p className="text-sm text-muted-foreground">
          WhatsApp and other in-app browsers on iPhone can block Google sign-in.
          Use Safari to continue.
        </p>
      </div>

      {reason ? (
        <p className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          Reason: {reason.replaceAll("_", " ")}
        </p>
      ) : null}

      <div className="space-y-3">
        <a href={target} target="_blank" rel="noopener noreferrer">
          <Button className="w-full" size="lg">
            Open in Safari
          </Button>
        </a>
        <Button variant="outline" className="w-full" size="lg" onClick={handleCopyLink}>
          Copy Link
        </Button>
        <a href={target} className="block text-center text-sm underline">
          {target}
        </a>
      </div>

      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Tap the menu (three dots) in this browser.</li>
        <li>Choose &quot;Open in Safari&quot;.</li>
        <li>In Safari, tap &quot;Continue with Google&quot; again.</li>
      </ol>
    </main>
  );
}
