"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Shield01Icon,
  UserAdd01Icon,
  Delete02Icon,
  UserCheck01Icon,
  AlertCircleIcon,
  RefreshIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import type { AdminUserInfo } from "@/lib/admin"

export function AdminUsersPanel() {
  const [admins, setAdmins] = React.useState<AdminUserInfo[]>([])
  const [loading, setLoading] = React.useState(true)
  const [newEmail, setNewEmail] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [revokingEmail, setRevokingEmail] = React.useState<string | null>(null)

  const fetchAdmins = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/users")
      if (!res.ok) {
        throw new Error("Failed to load admin users")
      }
      const data = await res.json()
      setAdmins(data.admins ?? [])
    } catch (err: any) {
      toast.error(err.message || "Could not fetch admin list")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  async function handleGrantAccess(e: React.FormEvent) {
    e.preventDefault()
    const email = newEmail.trim().toLowerCase()

    if (!email) {
      toast.error("Please enter an email address")
      return
    }

    if (!email.endsWith("@nu.edu.eg")) {
      toast.error(
        "Only official @nu.edu.eg university emails can be granted admin access."
      )
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to grant admin access")
      }

      toast.success(data.message || `Admin access granted to ${email}`)
      setNewEmail("")
      await fetchAdmins()
    } catch (err: any) {
      toast.error(err.message || "Failed to grant admin access")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRevokeAccess(email: string) {
    if (
      !confirm(`Are you sure you want to revoke admin access for ${email}?`)
    ) {
      return
    }

    try {
      setRevokingEmail(email)
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke admin access")
      }

      toast.success(data.message || `Revoked admin access for ${email}`)
      await fetchAdmins()
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke admin access")
    } finally {
      setRevokingEmail(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Grant Access Card */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-xs backdrop-blur-sm sm:p-6">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <HugeiconsIcon icon={UserAdd01Icon} size={18} />
          </div>
          <div>
            <h3 className="font-heading text-lg leading-tight font-semibold">
              Grant Admin Privileges
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add university email addresses to grant access to the NUSU
              Availability Admin Console.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleGrantAccess}
          className="mt-4 flex flex-col gap-2.5 sm:flex-row"
        >
          <div className="relative flex-1">
            <Input
              type="email"
              placeholder="e.g. member@nu.edu.eg"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="h-10 rounded-xl bg-background/80 pr-10 font-sans text-sm"
              disabled={submitting}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting || !newEmail.trim()}
            className="h-10 rounded-xl px-5 text-sm font-semibold transition-all duration-200"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Granting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <HugeiconsIcon icon={Shield01Icon} size={16} />
                Grant Access
              </span>
            )}
          </Button>
        </form>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <HugeiconsIcon
            icon={InformationCircleIcon}
            size={14}
            className="shrink-0 text-primary"
          />
          <span>
            If the user already has an account, their role is elevated
            immediately. If not, they will be granted admin access as soon as
            they sign up.
          </span>
        </div>
      </div>

      {/* Admin List Card */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-xs backdrop-blur-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HugeiconsIcon icon={Shield01Icon} size={18} />
            </div>
            <div>
              <h3 className="font-heading text-lg leading-tight font-semibold">
                Active Administrators ({admins.length})
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Personnel authorized to view analytics, schedule configuration,
                and manage member roles.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAdmins}
            disabled={loading}
            className="size-9 rounded-xl p-0"
            title="Refresh admin list"
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              size={16}
              className={loading ? "animate-spin" : ""}
            />
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading admin accounts...</span>
          </div>
        ) : admins.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No administrators found.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {admins.map((admin) => {
              const initials = admin.name
                ? admin.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : admin.email.slice(0, 2).toUpperCase()
              const isEnvAdmin = admin.source === "env"
              const isRevoking = revokingEmail === admin.email

              return (
                <div
                  key={admin.email}
                  className="flex flex-col justify-between gap-3 py-3.5 first:pt-1 last:pb-1 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-10 shrink-0 ring-1 ring-border/80">
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex min-w-0 flex-col">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {admin.name || "Pending Account Creation"}
                        </span>
                        {isEnvAdmin ? (
                          <Badge
                            variant="outline"
                            className="border-primary/40 bg-primary/5 px-2 py-0 text-[10px] text-primary"
                          >
                            System Super-Admin
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/40 bg-emerald-500/5 px-2 py-0 text-[10px] text-emerald-600 dark:text-emerald-400"
                          >
                            Custom Admin
                          </Badge>
                        )}
                        {admin.committee && (
                          <Badge
                            variant="secondary"
                            className="px-2 py-0 text-[10px]"
                          >
                            {admin.committee}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{admin.email}</span>
                        {admin.nuId && (
                          <>
                            <span>•</span>
                            <span>ID: {admin.nuId}</span>
                          </>
                        )}
                        {admin.addedBy && (
                          <>
                            <span>•</span>
                            <span>Added by: {admin.addedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                    {isEnvAdmin ? (
                      <span className="px-2 py-1 text-[11px] text-muted-foreground/70 italic">
                        System Protected
                      </span>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeAccess(admin.email)}
                        disabled={isRevoking}
                        className="h-8 rounded-xl px-3 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10"
                      >
                        {isRevoking ? (
                          <span className="mr-1.5 size-3 animate-spin rounded-full border-2 border-destructive border-t-transparent" />
                        ) : (
                          <HugeiconsIcon
                            icon={Delete02Icon}
                            size={14}
                            className="mr-1.5"
                          />
                        )}
                        Revoke Access
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
