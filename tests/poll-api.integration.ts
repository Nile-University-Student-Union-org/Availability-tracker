// Drives the real poll APIs through a running server and a real database.
// Needs `next start` on BASE_URL and a throwaway DB (see the integration job in .github/workflows/ci.yml).
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3100";
const dbUrl = process.env.DATABASE_URL ?? "";

// This wipes the database, so it only ever runs against a local one named for tests
const host = new URL(dbUrl).hostname;
assert.ok(
  ["localhost", "127.0.0.1"].includes(host) &&
    /test/.test(new URL(dbUrl).pathname),
  "Refusing to run: DATABASE_URL must be a local database with 'test' in its name",
);
assert.ok(
  BASE_URL.includes("localhost"),
  "Refusing to run: BASE_URL must be local",
);

const prisma = new PrismaClient();
const PASSWORD = "integration-test-password";

type Session = { cookie: string; ip: string };
let nextIp = 1;
const freshIp = () => `10.0.0.${nextIp++}`;

function call(
  session: Session | null,
  path: string,
  method = "GET",
  body?: unknown,
) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      origin: BASE_URL,
      "x-forwarded-for": session?.ip ?? "10.0.1.1",
      ...(session ? { cookie: session.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function signUp(
  email: string,
  fields: { role?: string; committee?: string; nuId?: string } = {},
): Promise<Session> {
  const session: Session = { cookie: "", ip: freshIp() };
  const created = await call(session, "/api/auth/sign-up/email", "POST", {
    name: email.split("@")[0],
    email,
    password: PASSWORD,
  });
  assert.equal(created.status, 200, `sign-up ${email}`);
  await prisma.user.update({
    where: { email },
    data: { nuId: "231000000", ...fields },
  });
  const signedIn = await call(session, "/api/auth/sign-in/email", "POST", {
    email,
    password: PASSWORD,
  });
  assert.equal(signedIn.status, 200, `sign-in ${email}`);
  session.cookie = signedIn.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return session;
}

const datePoll = (name: string, committees: string[]) => ({
  name,
  type: "date",
  committees,
  startDate: "2099-01-05",
  endDate: "2099-01-07",
  slotMode: "fixed",
  timeSlots: ["10:00", "11:00"],
});
const weeklyPoll = (name: string, committees: string[]) => ({
  name,
  type: "weekly",
  committees,
  weeklyDays: [0],
  weeklySlots: [{ dayOfWeek: 0, startTime: "10:00", endTime: "11:00" }],
});
const created = async (res: Response) => {
  assert.equal(res.status, 201, await res.clone().text());
  return (await res.json()).poll as {
    id: string;
    requestStatus: string | null;
  };
};
const visiblePollIds = async (session: Session) =>
  ((await (await call(session, "/api/polls")).json()) as { id: string }[]).map(
    (p) => p.id,
  );

await prisma.rateLimit.deleteMany();
await prisma.poll.deleteMany();
await prisma.user.deleteMany();
await prisma.committee.deleteMany();
await prisma.committee.createMany({
  data: ["Technical", "PR", "Media"].map((name) => ({ name })),
});

const superAdmin = await signUp("super@nu.edu.eg");
const techHead = await signUp("head@nu.edu.eg", {
  role: "admin",
  committee: "Technical",
});
const techMember = await signUp("tech@nu.edu.eg", { committee: "Technical" });
const prMember = await signUp("pr@nu.edu.eg", { committee: "PR" });
let passed = 0;
const check = async (name: string, run: () => Promise<void>) => {
  await run();
  passed++;
  console.log(`  ok ${name}`);
};

await check("signed out gets 401", async () => {
  assert.equal((await call(null, "/api/polls")).status, 401);
  assert.equal(
    (await call(null, "/api/admin/polls", "POST", datePoll("x", ["PR"])))
      .status,
    401,
  );
});

await check("a member can't create a poll", async () => {
  const res = await call(
    techMember,
    "/api/admin/polls",
    "POST",
    datePoll("x", ["Technical"]),
  );
  assert.ok([401, 403].includes(res.status), `got ${res.status}`);
});

await check("a head's poll for their own committee goes live", async () => {
  const poll = await created(
    await call(
      techHead,
      "/api/admin/polls",
      "POST",
      datePoll("Own", ["Technical"]),
    ),
  );
  assert.equal(poll.requestStatus, null);
  assert.ok((await visiblePollIds(techMember)).includes(poll.id));
  assert.ok(!(await visiblePollIds(prMember)).includes(poll.id));
});

await check(
  "another committee needs approval, then sees the poll",
  async () => {
    const poll = await created(
      await call(
        techHead,
        "/api/admin/polls",
        "POST",
        datePoll("Ask", ["Technical", "PR"]),
      ),
    );
    assert.equal(poll.requestStatus, "pending");
    assert.ok(
      !(await visiblePollIds(prMember)).includes(poll.id),
      "hidden while pending",
    );

    const denied = await call(
      techHead,
      `/api/admin/poll-requests/${poll.id}`,
      "POST",
      { action: "approve" },
    );
    assert.equal(denied.status, 403, "a head can't approve");

    const approved = await call(
      superAdmin,
      `/api/admin/poll-requests/${poll.id}`,
      "POST",
      { action: "approve" },
    );
    assert.equal(approved.status, 200);
    assert.ok(
      (await visiblePollIds(prMember)).includes(poll.id),
      "visible once approved",
    );
  },
);

await check("rejecting needs a reason and keeps the poll hidden", async () => {
  const poll = await created(
    await call(
      techHead,
      "/api/admin/polls",
      "POST",
      datePoll("No", ["Technical", "PR"]),
    ),
  );
  const url = `/api/admin/poll-requests/${poll.id}`;
  assert.equal(
    (await call(superAdmin, url, "POST", { action: "reject", reason: "  " }))
      .status,
    400,
  );
  assert.equal(
    (
      await call(superAdmin, url, "POST", {
        action: "reject",
        reason: "Too many slots",
      })
    ).status,
    200,
  );
  const saved = await prisma.poll.findUniqueOrThrow({ where: { id: poll.id } });
  assert.equal(saved.requestStatus, "rejected");
  assert.equal(saved.rejectionReason, "Too many slots");
  assert.ok(!(await visiblePollIds(prMember)).includes(poll.id));
});

await check("a member can mark the same slot in two polls", async () => {
  const first = await created(
    await call(
      techHead,
      "/api/admin/polls",
      "POST",
      datePoll("One", ["Technical"]),
    ),
  );
  const second = await created(
    await call(
      techHead,
      "/api/admin/polls",
      "POST",
      datePoll("Two", ["Technical"]),
    ),
  );
  for (const poll of [first, second]) {
    const res = await call(techMember, "/api/availability", "POST", {
      pollId: poll.id,
      date: "2099-01-05",
      slots: ["10:00"],
    });
    assert.equal(res.status, 200, await res.clone().text());
  }
  const tech = await prisma.user.findUniqueOrThrow({
    where: { email: "tech@nu.edu.eg" },
  });
  assert.equal(
    await prisma.availability.count({
      where: { userId: tech.id, startTime: "10:00" },
    }),
    2,
  );
});

await check("a member can't answer another committee's poll", async () => {
  const poll = await created(
    await call(
      techHead,
      "/api/admin/polls",
      "POST",
      datePoll("Tech", ["Technical"]),
    ),
  );
  const res = await call(prMember, "/api/availability", "POST", {
    pollId: poll.id,
    date: "2099-01-05",
    slots: ["10:00"],
  });
  assert.ok([403, 404].includes(res.status), `got ${res.status}`);
});

await check(
  "a committee filter can't widen past the poll's audience",
  async () => {
    const poll = await created(
      await call(
        techHead,
        "/api/admin/polls",
        "POST",
        weeklyPoll("Week", ["Technical"]),
      ),
    );
    const saved = await call(
      techMember,
      "/api/recurring-availability",
      "POST",
      {
        pollId: poll.id,
        slots: [{ dayOfWeek: 0, startTime: "10:00" }],
      },
    );
    assert.equal(saved.status, 200, await saved.clone().text());
    // A PR member answers the same poll directly in the database, as if they'd moved committee
    const pr = await prisma.user.findUniqueOrThrow({
      where: { email: "pr@nu.edu.eg" },
    });
    await prisma.recurringAvailability.create({
      data: {
        pollId: poll.id,
        userId: pr.id,
        dayOfWeek: 0,
        startTime: "10:00",
      },
    });

    const url = `/api/admin/recurring-analytics?pollId=${poll.id}`;
    const all = await (await call(superAdmin, url)).json();
    assert.equal(all.totalUsers, 1, "only the poll's committee counts");
    const outside = await (
      await call(superAdmin, `${url}&committee=PR`)
    ).json();
    assert.equal(
      outside.totalUsers,
      0,
      "filtering outside the audience shows nobody",
    );
    assert.equal(outside.users.length, 0);
  },
);

await check("sign-in is rate limited per IP, across requests", async () => {
  const attacker: Session = { cookie: "", ip: "10.0.2.1" };
  const attempt = (session: Session) =>
    call(session, "/api/auth/sign-in/email", "POST", {
      email: "tech@nu.edu.eg",
      password: "wrong-password",
    });
  for (let i = 0; i < 10; i++)
    assert.notEqual((await attempt(attacker)).status, 429, `attempt ${i + 1}`);
  assert.equal(
    (await attempt(attacker)).status,
    429,
    "11th attempt is blocked",
  );
  assert.notEqual(
    (await attempt({ cookie: "", ip: "10.0.2.2" })).status,
    429,
    "another IP is unaffected",
  );
  assert.ok((await prisma.rateLimit.count()) > 0, "counted in the database");
});

await prisma.$disconnect();
console.log(`poll API integration checks passed (${passed})`);
