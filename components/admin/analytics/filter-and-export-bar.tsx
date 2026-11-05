import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Download,
  FileSpreadsheet,
  Check,
  ChevronsUpDown,
  Filter,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveIndicator } from "@/components/admin/live-indicator";
import type { UserEntry } from "./types";

export function FilterAndExportBar({
  allKnownCommittees,
  selectedCommittees,
  committeeMemberCounts,
  filteredUsers,
  lastUpdated,
  status,
  toggleCommittee,
  handleClearCommittees,
  handleExportScheduleCsv,
  handleExportMatrixCsv,
}: {
  allKnownCommittees: string[];
  selectedCommittees: string[];
  committeeMemberCounts: Map<string, number>;
  filteredUsers: UserEntry[];
  lastUpdated: number | null;
  status: "live" | "reconnecting";
  toggleCommittee: (c: string) => void;
  handleClearCommittees: () => void;
  handleExportScheduleCsv: () => void;
  handleExportMatrixCsv: () => void;
}) {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [committeeSearch, setCommitteeSearch] = useState("");

  // Filtered committees matching the search query inside the popover
  const filteredAvailableCommittees = useMemo(() => {
    if (!committeeSearch.trim()) return allKnownCommittees;
    const q = committeeSearch.toLowerCase();
    return allKnownCommittees.filter((c) => c.toLowerCase().includes(q));
  }, [allKnownCommittees, committeeSearch]);

  return (
    <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2.5 min-w-0 max-w-full flex-1">
        {/* A single-committee poll has nothing to filter */}
        {allKnownCommittees.length > 1 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <Label
              htmlFor="committee-filter-btn"
              className="text-xs font-semibold tracking-widest text-muted-foreground uppercase shrink-0"
            >
              Filter by Committee:
            </Label>

            {/* Apple-grade Interactive Multi-Select Popover */}
            <Popover
              open={filterPopoverOpen}
              onOpenChange={setFilterPopoverOpen}
            >
              <PopoverTrigger
                id="committee-filter-btn"
                type="button"
                className={cn(
                  "group relative flex min-h-[44px] md:min-h-[38px] w-full sm:w-auto sm:min-w-[220px] max-w-full items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-left text-xs font-semibold shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.98] cursor-pointer touch-manipulation",
                  selectedCommittees.length > 0 &&
                    "border-primary/40 bg-primary/5 text-primary ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Filter className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="truncate text-foreground font-medium">
                    {selectedCommittees.length === 0
                      ? "All Committees"
                      : selectedCommittees.length === 1
                        ? selectedCommittees[0]
                        : selectedCommittees.length === 2
                          ? `${selectedCommittees[0]}, ${selectedCommittees[1]}`
                          : `${selectedCommittees.length} Committees`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedCommittees.length > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-2xs">
                      {selectedCommittees.length}
                    </span>
                  )}
                  <ChevronsUpDown className="size-3.5 text-muted-foreground/60" />
                </div>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                className="w-[calc(100vw-2rem)] sm:w-88 max-w-md rounded-2xl border border-border/80 bg-popover/98 p-3 shadow-2xl backdrop-blur-xl space-y-2.5 overflow-hidden"
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Filter className="size-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Select Committees
                    </span>
                  </div>
                  {selectedCommittees.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={handleClearCommittees}
                      className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Clear
                    </Button>
                  )}
                </div>

                {/* Search Input */}
                {allKnownCommittees.length > 8 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search committees..."
                      value={committeeSearch}
                      onChange={(e) => setCommitteeSearch(e.target.value)}
                      className="h-8 pl-8 pr-7 text-xs bg-muted/40 rounded-xl"
                    />
                    {committeeSearch && (
                      <button
                        type="button"
                        onClick={() => setCommitteeSearch("")}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Committees Checkbox List */}
                <div className="max-h-72 space-y-0.5 overflow-x-hidden overflow-y-auto overscroll-contain py-1 [mask-image:linear-gradient(to_bottom,transparent,black_12px,black_calc(100%-12px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {filteredAvailableCommittees.map((c) => {
                    const isSelected = selectedCommittees.includes(c);
                    const memberCount = committeeMemberCounts.get(c) ?? 0;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCommittee(c)}
                        className={cn(
                          "group flex w-full min-h-[44px] items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors cursor-pointer select-none touch-manipulation active:scale-[0.99] md:min-h-10",
                          isSelected
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted/60",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background group-hover:border-primary/50",
                            )}
                          >
                            {isSelected && (
                              <Check className="size-3 stroke-[2.5]" />
                            )}
                          </div>
                          <span className="truncate text-left block flex-1 font-medium">
                            {c}
                          </span>
                        </div>
                        <span className="shrink-0 whitespace-nowrap pl-1 text-xs tabular-nums text-muted-foreground">
                          {memberCount} answered
                        </span>
                      </button>
                    );
                  })}
                  {filteredAvailableCommittees.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No committees match &quot;{committeeSearch}&quot;
                    </p>
                  )}
                </div>

                {/* Popover Footer */}
                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <span>
                    {selectedCommittees.length === 0
                      ? `${filteredUsers.length} answered in all committees`
                      : `${filteredUsers.length} answered in ${selectedCommittees.length} ${selectedCommittees.length === 1 ? "committee" : "committees"}`}
                  </span>
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => setFilterPopoverOpen(false)}
                    className="h-9 px-4 text-xs font-semibold cursor-pointer touch-manipulation active:scale-[0.97]"
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}

        <LiveIndicator lastUpdated={lastUpdated} status={status} />
        {/* Interactive Selected Committee Pills / Badges */}
        {selectedCommittees.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 max-w-full">
            <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
              Active:
            </span>
            {selectedCommittees.map((c) => (
              <Badge
                key={c}
                variant="outline"
                className="h-auto min-h-[24px] max-w-full gap-1 rounded-lg border-primary/30 bg-primary/10 text-primary text-[11px] font-medium py-0.5 pr-1 pl-2 transition-all hover:bg-primary/15"
              >
                <span className="truncate max-w-[200px]">{c}</span>
                <button
                  type="button"
                  onClick={() => toggleCommittee(c)}
                  className="rounded-full p-0.5 hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors cursor-pointer shrink-0"
                  title={`Remove ${c} from filter`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearCommittees}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer shrink-0"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Export & Summary Badges */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <Badge
          variant="outline"
          className={cn(
            "w-fit text-xs font-semibold py-1 px-2.5 rounded-xl transition-colors",
            selectedCommittees.length > 0
              ? "border-primary/30 bg-primary/5 text-primary"
              : "border-border/70 text-muted-foreground",
          )}
        >
          {selectedCommittees.length === 0
            ? `All committees (${filteredUsers.length} answered)`
            : `Showing ${filteredUsers.length} member${filteredUsers.length === 1 ? "" : "s"} across ${selectedCommittees.length} committee${selectedCommittees.length === 1 ? "" : "s"}`}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="h-11 gap-1.5 text-xs cursor-pointer touch-manipulation active:scale-95 md:h-8"
          onClick={handleExportScheduleCsv}
          title="Export finalized meetings schedule as CSV"
        >
          <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Schedule CSV</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-11 gap-1.5 text-xs cursor-pointer touch-manipulation active:scale-95 md:h-8"
          onClick={handleExportMatrixCsv}
          title="Export full member availability matrix as CSV"
        >
          <Download className="size-3.5" />
          <span>Matrix CSV</span>
        </Button>
      </div>
    </div>
  );
}
