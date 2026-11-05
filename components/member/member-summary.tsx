import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function initials(name?: string, email?: string) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length) return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
  return email?.slice(0, 2).toUpperCase() ?? "SU";
}

/** One quiet line saying who is answering, so the poll itself gets the space. */
export function MemberSummary({
  name,
  email,
  image,
  committee,
  nuId,
  className,
}: {
  name?: string;
  email?: string;
  image?: string | null;
  committee?: string;
  nuId?: string;
  className?: string;
}) {
  const details = [committee, nuId && `ID ${nuId}`].filter(Boolean).join(" · ");
  return (
    <div className={cn("flex w-full items-center gap-3 px-1", className)}>
      <Avatar className="size-9 shrink-0 rounded-full">
        <AvatarImage src={image ?? undefined} alt={name || "Member avatar"} />
        <AvatarFallback className="bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          {initials(name, email)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {name || "Union Member"}
        </p>
        <p
          className="truncate text-xs text-muted-foreground tabular-nums"
          title={email}
        >
          {details || email}
        </p>
      </div>
    </div>
  );
}
