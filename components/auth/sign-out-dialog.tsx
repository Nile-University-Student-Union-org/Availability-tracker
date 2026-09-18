"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  async function handleConfirmSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            onOpenChange(false);
            router.push("/auth?mode=signin");
          },
          onError: () => {
            toast.error("Failed to sign out. Please try again.");
            setIsSigningOut(false);
          },
        },
      });
    } catch {
      toast.error("An error occurred while signing out.");
      setIsSigningOut(false);
    }
  }

  // Mobile Bottom Sheet Drawer (vaul)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="px-4 pb-8">
          <div className="mx-auto flex max-w-sm flex-col items-center text-center">
            {/* Red Destructive Sign Out Emblem */}
            <div className="mt-4 mb-4 flex size-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-1 ring-red-500/20 dark:bg-red-500/15 dark:ring-red-500/30">
              <HugeiconsIcon icon={Logout02Icon} size={24} strokeWidth={2.2} />
            </div>

            <DrawerHeader className="p-0">
              <DrawerTitle className="font-heading text-xl font-bold tracking-tight">
                Sign out of your account?
              </DrawerTitle>
              <DrawerDescription className="mt-2 text-xs text-muted-foreground sm:text-sm">
                You will be signed out of Nile University Availability Tracker.
                You can sign back in anytime to update your availability.
              </DrawerDescription>
            </DrawerHeader>

            <DrawerFooter className="mt-6 flex w-full flex-col gap-3 p-0">
              <Button
                type="button"
                variant="destructive"
                disabled={isSigningOut}
                onClick={handleConfirmSignOut}
                className="h-12 min-h-[48px] w-full rounded-2xl text-sm font-semibold shadow-xs touch-manipulation active:scale-[0.98]"
              >
                {isSigningOut ? (
                  <>
                    <Spinner className="mr-2 size-4" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <HugeiconsIcon
                      icon={Logout02Icon}
                      size={16}
                      strokeWidth={2.2}
                      className="mr-2"
                    />
                    <span>Yes, sign out</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isSigningOut}
                onClick={() => onOpenChange(false)}
                className="h-12 min-h-[48px] w-full rounded-2xl text-sm font-semibold touch-manipulation active:scale-[0.98]"
              >
                Cancel
              </Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Centered Alert Dialog
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md rounded-3xl p-6 sm:p-7">
        <AlertDialogHeader className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 ring-1 ring-red-500/20 dark:bg-red-500/15 dark:ring-red-500/30">
            <HugeiconsIcon icon={Logout02Icon} size={22} strokeWidth={2.2} />
          </div>

          <div className="space-y-1.5">
            <AlertDialogTitle className="font-heading text-lg font-bold tracking-tight text-foreground sm:text-xl">
              Sign out of your account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground sm:text-sm">
              You will be signed out of Nile University Availability Tracker.
              You can sign back in anytime to update your availability.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-4 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isSigningOut}
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl px-5 text-xs font-semibold cursor-pointer active:scale-[0.98]"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={isSigningOut}
            onClick={handleConfirmSignOut}
            className="h-10 rounded-xl px-5 text-xs font-semibold cursor-pointer shadow-xs active:scale-[0.98]"
          >
            {isSigningOut ? (
              <>
                <Spinner className="mr-2 size-3.5" />
                <span>Signing out...</span>
              </>
            ) : (
              <>
                <HugeiconsIcon
                  icon={Logout02Icon}
                  size={15}
                  strokeWidth={2.2}
                  className="mr-1.5"
                />
                <span>Sign out</span>
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
