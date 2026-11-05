import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAvatar } from "./user-avatar";
import { formatDayFull, formatTime } from "./format";
import type { UserEntry } from "./types";

export function MemberScheduleDialog({
  viewingUser,
  setViewingUser,
  isMobile,
}: {
  viewingUser: UserEntry | null;
  setViewingUser: (user: UserEntry | null) => void;
  isMobile: boolean;
}) {
  return (
    <>
      {/* ── Individual member schedule dialog / drawer ───────────────────── */}
      {isMobile ? (
        <Drawer
          open={!!viewingUser}
          onOpenChange={(open) => !open && setViewingUser(null)}
        >
          <DrawerContent className="max-h-[85vh] px-4 pb-6">
            {viewingUser && (
              <>
                <DrawerHeader className="px-0 text-left">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={viewingUser.name}
                      email={viewingUser.email}
                      image={viewingUser.image}
                      size="sm"
                    />
                    <div className="text-left">
                      <DrawerTitle className="font-heading text-lg">
                        {viewingUser.name ?? "Member Schedule"}
                      </DrawerTitle>
                      <DrawerDescription className="text-xs">
                        {viewingUser.email}{" "}
                        {viewingUser.nuId && `· ID: ${viewingUser.nuId}`}
                      </DrawerDescription>
                    </div>
                  </div>
                </DrawerHeader>

                <div className="mt-2 flex-1 overflow-y-auto overscroll-contain pr-2">
                  <div className="space-y-6 pb-2">
                    {Object.entries(viewingUser.byDate)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, slots]) => (
                        <div key={date}>
                          <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            {formatDayFull(date)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {slots.sort().map((slot) => (
                              <Badge
                                key={slot}
                                variant="secondary"
                                className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              >
                                {formatTime(slot)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    {Object.keys(viewingUser.byDate).length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No availability marked yet.
                      </p>
                    )}
                  </div>
                </div>

                <DrawerFooter className="sticky bottom-0 mt-3 border-t bg-background px-0 pt-3">
                  <Button
                    variant="outline"
                    onClick={() => setViewingUser(null)}
                    className="h-11 min-h-[44px] w-full text-sm font-semibold touch-manipulation active:scale-[0.98]"
                  >
                    Close
                  </Button>
                </DrawerFooter>
              </>
            )}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          open={!!viewingUser}
          onOpenChange={(open) => !open && setViewingUser(null)}
        >
          <DialogContent className="max-w-md rounded-3xl">
            {viewingUser && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={viewingUser.name}
                      email={viewingUser.email}
                      image={viewingUser.image}
                      size="sm"
                    />
                    <div className="text-left">
                      <DialogTitle className="font-heading text-lg">
                        {viewingUser.name ?? "Member Schedule"}
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        {viewingUser.email}{" "}
                        {viewingUser.nuId && `· ID: ${viewingUser.nuId}`}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <ScrollArea className="mt-4 max-h-[60vh] pr-4">
                  <div className="space-y-6 pb-2">
                    {Object.entries(viewingUser.byDate)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, slots]) => (
                        <div key={date}>
                          <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                            {formatDayFull(date)}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {slots.sort().map((slot) => (
                              <Badge
                                key={slot}
                                variant="secondary"
                                className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                              >
                                {formatTime(slot)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    {Object.keys(viewingUser.byDate).length === 0 && (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No availability marked yet.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
