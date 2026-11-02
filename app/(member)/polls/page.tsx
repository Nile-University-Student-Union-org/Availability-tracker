import Link from "next/link";
import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canSeePoll } from "@/lib/poll-access";

export const dynamic = "force-dynamic";
export default async function PollListPage() {
  const session = await getCachedSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { id: true, committee: true } });
  const polls = await prisma.poll.findMany({ where: { active: true, OR: [{ allCommittees: true }, ...(user?.committee ? [{ committees: { has: user.committee } }] : [])] }, select: { id: true, name: true, type: true, active: true, allCommittees: true, committees: true }, orderBy: { createdAt: "desc" } });
  return <main className="container mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-28 pb-12"><h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Availability polls</h1><div className="grid gap-3">{polls.filter((p) => user && canSeePoll(p, user)).map((poll) => <Link key={poll.id} href={`/polls/${poll.id}`} className="rounded-xl border bg-card p-5 transition-colors hover:bg-muted"><span className="font-medium">{poll.name}</span><span className="ml-3 text-sm capitalize text-muted-foreground">{poll.type}</span></Link>)}{polls.length === 0 && <p className="text-sm text-muted-foreground">No active polls are available to your committee.</p>}</div></main>;
}
