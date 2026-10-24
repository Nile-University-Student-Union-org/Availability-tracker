"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { authClient } from "@/lib/auth-client";
import { HugeiconsIcon } from "@hugeicons/react";
import { IdentificationIcon } from "@hugeicons/core-free-icons";

interface ProfileCompletionProps {
  name: string;
  email: string;
  initialNuId: string;
  initialCommittee: string;
  committees: string[];
}

// One-time step before the calendars: Microsoft sign-in gives neither an NU ID nor a committee.
export function ProfileCompletion({
  name,
  email,
  initialNuId,
  initialCommittee,
  committees,
}: ProfileCompletionProps) {
  const router = useRouter();
  const [nuId, setNuId] = useState(initialNuId);
  const [committee, setCommittee] = useState(initialCommittee);
  const [saving, setSaving] = useState(false);
  const idValid = /^\d{9}$/.test(nuId);

  async function save() {
    if (!idValid || !committee) return;
    setSaving(true);
    const { error } = await authClient.updateUser({ nuId, committee });
    setSaving(false);
    if (error) {
      toast.error(error.message || "Couldn't save your profile. Try again.");
      return;
    }
    localStorage.setItem("memberId", nuId);
    localStorage.setItem("memberCommittee", committee);
    toast.success("You're all set");
    router.replace("/");
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <HugeiconsIcon icon={IdentificationIcon} size={20} />
        </div>
        <div className="min-w-0">
          <h1 className="font-heading text-lg font-bold tracking-tight">
            Finish your profile
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            One quick step before you mark your availability.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-muted/50 px-3.5 py-2.5">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>

      <div className="mt-5 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="profile-nuid" className="text-xs font-medium">
              NU ID
            </Label>
            <span
              className={
                idValid
                  ? "text-[11px] font-medium text-emerald-700 tabular-nums dark:text-emerald-400"
                  : "text-[11px] text-muted-foreground tabular-nums"
              }
            >
              {nuId.length}/9
            </span>
          </div>
          <Input
            id="profile-nuid"
            inputMode="numeric"
            autoComplete="off"
            placeholder="e.g. 211100000"
            maxLength={9}
            value={nuId}
            onChange={(e) => setNuId(e.target.value.replace(/\D/g, ""))}
            className="h-11 rounded-xl border-border/80 bg-background px-3.5 tabular-nums"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-committee" className="text-xs font-medium">
            Committee
          </Label>
          <Select
            value={committee}
            onValueChange={(val) => val && setCommittee(val)}
          >
            <SelectTrigger
              id="profile-committee"
              className="h-11 w-full rounded-xl border-border/80 bg-background px-3.5 data-[size=default]:h-11"
            >
              <SelectValue placeholder="Choose your committee" />
            </SelectTrigger>
            <SelectContent>
              {committees.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={save}
          disabled={!idValid || !committee || saving}
          className="h-11 w-full cursor-pointer touch-manipulation rounded-xl font-semibold active:scale-[0.98]"
        >
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
