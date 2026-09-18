import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Returns the list of admin email addresses from the ADMIN_EMAILS env variable.
 * Format: comma-separated list, e.g. "admin@nu.edu.eg, bob@nu.edu.eg"
 *
 * This file is server-only — never import it in client components.
 */
export function getEnvAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Checks if the given email belongs to an admin.
 * Uses React cache() to deduplicate checks within the same render cycle.
 * Checks environment variables first (0ms), then runs DB queries concurrently.
 */
export const isAdminEmail = cache(
  async (email?: string | null): Promise<boolean> => {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();

    // 1. Check environment variables (instant, zero DB queries)
    if (getEnvAdminEmails().includes(normalized)) {
      return true;
    }

    try {
      // 2. Check AdminEmail table and User table concurrently in a single parallel round trip
      const [inAdminEmail, user] = await Promise.all([
        prisma.adminEmail.findUnique({
          where: { email: normalized },
          select: { id: true },
        }),
        prisma.user.findUnique({
          where: { email: normalized },
          select: { role: true },
        }),
      ]);

      if (
        inAdminEmail ||
        user?.role === "admin" ||
        user?.role === "super-admin"
      ) {
        return true;
      }
    } catch (error) {
      console.error("Error checking admin email in DB:", error);
    }

    return false;
  },
);

export type AdminUserInfo = {
  email: string;
  source: "env" | "db";
  name?: string | null;
  nuId?: string | null;
  committee?: string | null;
  addedBy?: string | null;
  createdAt?: string;
};

/**
 * Returns all admin emails with metadata.
 */
export async function getAllAdminUsers(): Promise<AdminUserInfo[]> {
  const envEmails = getEnvAdminEmails();

  let dbAdminEmails: {
    email: string;
    addedBy: string | null;
    createdAt: Date;
  }[] = [];
  let dbAdminUsers: {
    email: string;
    name: string;
    nuId: string | null;
    committee: string | null;
    createdAt: Date;
  }[] = [];

  try {
    dbAdminEmails = await prisma.adminEmail.findMany({
      orderBy: { createdAt: "desc" },
    });
    dbAdminUsers = await prisma.user.findMany({
      where: { role: { in: ["admin", "super-admin"] } },
      select: {
        email: true,
        name: true,
        nuId: true,
        committee: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error("Error fetching admin emails from DB:", error);
  }

  const allEmails = new Set<string>([
    ...envEmails,
    ...dbAdminEmails.map((e) => e.email.toLowerCase()),
    ...dbAdminUsers.map((u) => u.email.toLowerCase()),
  ]);

  // Get user records for names & details
  const users = await prisma.user.findMany({
    where: { email: { in: Array.from(allEmails) } },
    select: { email: true, name: true, nuId: true, committee: true },
  });
  const userMap = new Map(users.map((u) => [u.email.toLowerCase(), u]));
  const dbEmailMap = new Map(
    dbAdminEmails.map((e) => [e.email.toLowerCase(), e]),
  );

  return Array.from(allEmails).map((email) => {
    const isEnv = envEmails.includes(email);
    const user = userMap.get(email);
    const dbEmail = dbEmailMap.get(email);

    return {
      email,
      source: isEnv ? "env" : "db",
      name: user?.name ?? (isEnv ? "System Administrator" : null),
      nuId: user?.nuId ?? null,
      committee: user?.committee ?? null,
      addedBy: dbEmail?.addedBy ?? (isEnv ? "Environment Configuration" : null),
      createdAt: dbEmail?.createdAt
        ? dbEmail.createdAt.toISOString()
        : undefined,
    };
  });
}

/**
 * Grants admin access to an email.
 */
export async function grantAdminAccess(
  email: string,
  addedBy?: string,
): Promise<{ success: boolean; message: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.endsWith("@nu.edu.eg")) {
    return {
      success: false,
      message:
        "Only official @nu.edu.eg university emails can be granted admin access.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.adminEmail.upsert({
        where: { email: normalized },
        update: { addedBy: addedBy ?? "Admin" },
        create: { email: normalized, addedBy: addedBy ?? "Admin" },
      });

      // If user already exists in DB, update their role
      await tx.user.updateMany({
        where: { email: normalized },
        data: { role: "admin" },
      });
    });

    return { success: true, message: `Admin access granted to ${normalized}` };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to grant admin access";
    return {
      success: false,
      message,
    };
  }
}

/**
 * Revokes admin access for an email (cannot revoke env super-admins).
 */
export async function revokeAdminAccess(
  email: string,
): Promise<{ success: boolean; message: string }> {
  const normalized = email.trim().toLowerCase();
  if (getEnvAdminEmails().includes(normalized)) {
    return {
      success: false,
      message: "Cannot revoke access for system environment administrators.",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.adminEmail.deleteMany({
        where: { email: normalized },
      });

      await tx.user.updateMany({
        where: { email: normalized },
        data: { role: "user" },
      });
    });

    return { success: true, message: `Admin access revoked for ${normalized}` };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to revoke admin access";
    return {
      success: false,
      message,
    };
  }
}
