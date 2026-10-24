import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { getCommittees } from "@/lib/committees";
import { isAdminEmail } from "@/lib/admin";
import { NusuLogo } from "@/components/nusu-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileCompletion } from "@/components/profile-completion";

export const metadata: Metadata = {
  title: "Finish your profile | Nile University Student Union",
};

export const dynamic = "force-dynamic";

export default async function WelcomePage() {
  const session = await getCachedSession();
  if (!session) redirect("/auth?mode=signin&callbackUrl=/welcome");

  const user = session.user as typeof session.user & {
    nuId?: string | null;
    committee?: string | null;
  };
  if ((user.nuId && user.committee) || (await isAdminEmail(user.email))) {
    redirect("/");
  }

  const committees = await getCommittees();

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-background py-12">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-md flex-col items-center gap-8 px-6">
        <NusuLogo size="lg" />
        <div className="w-full rounded-3xl border bg-card p-5 shadow-sm sm:p-7">
          <ProfileCompletion
            name={user.name}
            email={user.email}
            initialNuId={user.nuId ?? ""}
            initialCommittee={user.committee ?? ""}
            committees={committees}
          />
        </div>
      </div>
    </main>
  );
}
