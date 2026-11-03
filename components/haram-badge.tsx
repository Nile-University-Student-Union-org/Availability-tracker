import { PyramidIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";

/** Super-admin ("HARAM") role tag, shared by every admin list. */
export function HaramBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-1 border-red-500/35 bg-red-500/10 px-2 py-0 text-[11px] font-semibold tracking-wide text-red-700 dark:border-red-400/40 dark:bg-red-500/15 dark:text-red-300"
    >
      <HugeiconsIcon icon={PyramidIcon} strokeWidth={2} className="size-3" />
      HARAM
    </Badge>
  );
}
