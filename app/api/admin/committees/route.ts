import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail, isSuperAdmin } from "@/lib/admin";
import { COMMITTEES as DEFAULT_COMMITTEES } from "@/lib/constants";

/**
 * GET /api/admin/committees
 * Returns all committees with active member counts.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    let committees = await prisma.committee.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // Auto-seed default committees if empty
    if (committees.length === 0) {
      await prisma.committee.createMany({
        data: DEFAULT_COMMITTEES.map((name) => ({ name })),
        skipDuplicates: true,
      });
      committees = await prisma.committee.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
    }

    // Get member counts grouped by committee
    const userGroups = await prisma.user.groupBy({
      by: ["committee"],
      _count: { id: true },
      where: {
        committee: { not: null },
      },
    });

    const countMap = new Map<string, number>();
    for (const group of userGroups) {
      if (group.committee) {
        countMap.set(group.committee.toLowerCase(), group._count.id);
      }
    }

    const result = committees.map((c) => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      memberCount: countMap.get(c.name.toLowerCase()) ?? 0,
    }));

    return NextResponse.json({ committees: result });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch committees";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/committees
 * Adds a new committee.
 */
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Committee name is required" },
        { status: 400 },
      );
    }

    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { error: "Committee name must be between 2 and 50 characters" },
        { status: 400 },
      );
    }

    // Check for existing committee (case-insensitive)
    const existing = await prisma.committee.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Committee "${existing.name}" already exists` },
        { status: 409 },
      );
    }

    const last = await prisma.committee.aggregate({
      _max: { sortOrder: true },
    });
    const newCommittee = await prisma.committee.create({
      data: { name, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });

    return NextResponse.json({
      success: true,
      committee: {
        id: newCommittee.id,
        name: newCommittee.name,
        createdAt: newCommittee.createdAt,
        memberCount: 0,
      },
      message: `Committee "${newCommittee.name}" created successfully.`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create committee";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/committees
 * Deletes a committee.
 */
export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Committee ID is required" },
        { status: 400 },
      );
    }

    const target = await prisma.committee.findUnique({
      where: { id },
    });

    if (!target) {
      return NextResponse.json(
        { error: "Committee not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async tx => {
      await tx.user.updateMany({ where: { committee: target.name }, data: { committee: null } });
      const polls = await tx.poll.findMany({ where: { OR: [{ committees: { has: target.name } }, { requestedCommittees: { has: target.name } }] }, select: { id: true, committees: true, requestedCommittees: true } });
      for (const poll of polls) await tx.poll.update({ where: { id: poll.id }, data: { committees: poll.committees.filter(c => c !== target.name), requestedCommittees: poll.requestedCommittees.filter(c => c !== target.name) } });
      await tx.committee.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: `Committee "${target.name}" has been deleted. Any members assigned have been unassigned.`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete committee";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/committees
 * Saves the display order. Body: { ids: string[] } listing every committee once.
 */
export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email || !isSuperAdmin(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (body.id && body.name) {
      const id = String(body.id), name = String(body.name).trim();
      if (name.length < 2 || name.length > 50) return NextResponse.json({ error: "Committee name must be between 2 and 50 characters" }, { status: 400 });
      const target = await prisma.committee.findUnique({ where: { id } });
      if (!target) return NextResponse.json({ error: "Committee not found" }, { status: 404 });
      if (await prisma.committee.findFirst({ where: { name: { equals: name, mode: "insensitive" }, id: { not: id } } })) return NextResponse.json({ error: `Committee "${name}" already exists` }, { status: 409 });
      await prisma.$transaction(async tx => {
        await tx.committee.update({ where: { id }, data: { name } });
        await tx.user.updateMany({ where: { committee: target.name }, data: { committee: name } });
        const polls = await tx.poll.findMany({ where: { OR: [{ committees: { has: target.name } }, { requestedCommittees: { has: target.name } }] }, select: { id: true, committees: true, requestedCommittees: true } });
        for (const poll of polls) await tx.poll.update({ where: { id: poll.id }, data: { committees: poll.committees.map(c => c === target.name ? name : c), requestedCommittees: poll.requestedCommittees.map(c => c === target.name ? name : c) } });
      });
      return NextResponse.json({ success: true, committee: { ...target, name } });
    }
    const ids: unknown = body?.ids;
    const existing = await prisma.committee.findMany({ select: { id: true } });
    const known = new Set(existing.map((c) => c.id));

    if (
      !Array.isArray(ids) ||
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((id) => typeof id === "string" && known.has(id))
    ) {
      return NextResponse.json(
        { error: "Order must list every committee exactly once" },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      (ids as string[]).map((id, sortOrder) =>
        prisma.committee.update({ where: { id }, data: { sortOrder } }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to reorder committees";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
