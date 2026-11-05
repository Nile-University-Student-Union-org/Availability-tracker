"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Calendar03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export interface PollCardData {
  id: string;
  name: string;
  answered: boolean;
  summary: string;
}

interface PollListProps {
  polls: PollCardData[];
}

export function PollList({ polls }: PollListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Active opening poll ID is derived directly from transition state
  const openingId = isPending ? selectedId : null;

  // Reset if navigation is cancelled (back button / bfcache restore)
  useEffect(() => {
    const handleReset = () => setSelectedId(null);
    window.addEventListener("popstate", handleReset);
    window.addEventListener("pageshow", handleReset);
    return () => {
      window.removeEventListener("popstate", handleReset);
      window.removeEventListener("pageshow", handleReset);
    };
  }, []);

  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    pollId: string,
  ) => {
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey
    ) {
      return;
    }
    if (openingId) {
      e.preventDefault();
      return;
    }
    // Our transition drives navigation so the pending card can show a spinner
    e.preventDefault();
    setSelectedId(pollId);
    startTransition(() => {
      router.push(`/polls/${pollId}`);
    });
  };

  return (
    <ul className="flex flex-col gap-3">
      {polls.map((poll) => {
        const isThisOpening = openingId === poll.id;
        const isOtherOpening = Boolean(openingId && openingId !== poll.id);

        return (
          <li key={poll.id}>
            <Link
              href={`/polls/${poll.id}`}
              aria-label={poll.answered ? `${poll.name}, answered` : poll.name}
              aria-busy={isThisOpening}
              onClick={(e) => handleClick(e, poll.id)}
              className={cn(
                "group flex min-h-[56px] items-center gap-4 rounded-3xl glass glass-bloom p-4 transition-[background-color,opacity,transform] duration-200 touch-manipulation sm:p-5",
                isThisOpening
                  ? "bg-(--glass-hover)"
                  : "hover:bg-(--glass-hover) active:scale-[0.985]",
                isOtherOpening && "pointer-events-none opacity-40",
              )}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground">
                <HugeiconsIcon icon={Calendar03Icon} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 font-heading text-base font-semibold tracking-tight break-words">
                    {poll.name}
                  </span>
                  {poll.answered && (
                    <span className="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-2 text-[11px] font-semibold text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300">
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        size={12}
                        strokeWidth={2.2}
                      />
                      Answered
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  <span className="tabular-nums">{poll.summary}</span>
                </span>
              </span>
              {isThisOpening ? (
                <Spinner
                  className="size-4 shrink-0 text-(--glass-nile-fg)"
                  label="Opening poll"
                />
              ) : (
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={18}
                  className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
