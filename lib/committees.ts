import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { COMMITTEES as DEFAULT_COMMITTEES } from "@/lib/constants";

/**
 * Returns all active committees ordered by name.
 * If no committees are in the database yet, auto-seeds the default NUSU committees.
 */
export const getCommittees = cache(async (): Promise<string[]> => {
  try {
    const existing = await prisma.committee.findMany({
      orderBy: { name: "asc" },
      select: { name: true },
    });

    if (existing.length > 0) {
      return existing.map((c) => c.name);
    }

    // Auto-seed default committees if table is empty
    await prisma.committee.createMany({
      data: DEFAULT_COMMITTEES.map((name) => ({ name })),
      skipDuplicates: true,
    });

    return [...DEFAULT_COMMITTEES].sort();
  } catch (err) {
    console.error("Error fetching committees, falling back to defaults:", err);
    return DEFAULT_COMMITTEES;
  }
});
