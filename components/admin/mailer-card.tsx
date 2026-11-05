"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/lib/notify";
import { cn } from "@/lib/utils";

type MailerStatus = {
  configured: boolean;
  sender: string | null;
  status: string;
  accountEmail: string | null;
  lastError: string | null;
};

const CONNECT_ERRORS: Record<string, string> = {
  state: "That sign-in expired. Try connecting again.",
  consent: "Microsoft requires an admin to approve this app first.",
  authorization: "Microsoft sign-in was cancelled or refused.",
  token: "Microsoft sign-in failed. Try connecting again.",
  account: "Sign in with the sender mailbox, not your own account.",
  configuration: "Mail isn't set up on the server yet.",
};

/** Connects the mailbox that sends poll-request emails to super admins. */
export function MailerCard() {
  const [mailer, setMailer] = React.useState<MailerStatus | null>(null);
  const [disconnecting, setDisconnecting] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/admin/mailer", { cache: "no-store" });
    if (res.ok) setMailer(await res.json());
  }, []);

  React.useEffect(() => {
    void load();
    // Result of the Microsoft redirect; removed so a reload doesn't repeat the toast
    const url = new URL(window.location.href);
    const flag = url.searchParams.get("mailer");
    if (!flag) return;
    if (flag === "connected") toast.success("Mailbox connected");
    else toast.error(CONNECT_ERRORS[flag] ?? "Couldn't connect the mailbox.");
    url.searchParams.delete("mailer");
    window.history.replaceState({}, "", url.toString());
  }, [load]);

  async function disconnect() {
    setDisconnecting(true);
    const res = await fetch("/api/admin/mailer", { method: "DELETE" });
    if (res.ok) await load();
    else toast.error("Couldn't disconnect the mailbox.");
    setDisconnecting(false);
  }

  if (!mailer) return <Skeleton aria-busy className="h-[76px] rounded-3xl" />;

  const connected = mailer.status === "connected";
  return (
    <section
      aria-label="Email sender"
      className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl border border-border/60 bg-card/60 p-4"
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          connected
            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "bg-muted text-muted-foreground",
        )}
      >
        <HugeiconsIcon icon={Mail01Icon} size={20} />
      </span>
      <div className="min-w-[12rem] flex-1">
        <p className="text-sm font-semibold">
          {connected ? "Request emails are on" : "Request emails are off"}
        </p>
        <p className="text-xs break-words text-muted-foreground">
          {!mailer.configured
            ? "Mail isn't set up on the server yet."
            : connected
              ? `Sent from ${mailer.accountEmail}`
              : `Connect ${mailer.sender} to email super admins about new requests.`}
        </p>
        {mailer.lastError && (
          <p role="alert" className="mt-1 text-xs text-(--tint-red-fg)">
            {mailer.lastError}
          </p>
        )}
      </div>
      {connected ? (
        <Button
          variant="ghost"
          onClick={disconnect}
          disabled={disconnecting}
          aria-busy={disconnecting}
          className="min-h-[44px] md:min-h-9"
        >
          {disconnecting && <Spinner label="Disconnecting" />}
          Disconnect
        </Button>
      ) : (
        mailer.configured && (
          // Full page navigation: the route redirects to Microsoft
          <a
            href="/api/admin/mailer/microsoft/connect"
            className={cn(buttonVariants({ variant: "default" }), "min-h-[44px] md:min-h-9")}
          >
            Connect mailbox
          </a>
        )
      )}
    </section>
  );
}
