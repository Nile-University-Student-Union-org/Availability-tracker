import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
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
      orderBy: { name: "asc" },
    });

    // Auto-seed default committees if empty
    if (committees.length === 0) {
      await prisma.committee.createMany({
        data: DEFAULT_COMMITTEES.map((name) => ({ name })),
        skipDuplicates: true,
      });
      committees = await prisma.committee.findMany({
        orderBy: { name: "asc" },
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
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
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

    const newCommittee = await prisma.committee.create({
      data: { name },
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
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
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

    // Unassign members from this committee so their accounts remain intact
    await prisma.user.updateMany({
      where: { committee: target.name },
      data: { committee: null },
    });

    // Delete the committee
    await prisma.committee.delete({
      where: { id },
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
