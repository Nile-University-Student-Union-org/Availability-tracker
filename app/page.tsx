import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function Home() {
  const session = await getCachedSession();
  if (!session) redirect("/auth?mode=signin&callbackUrl=/");
  if (session.user.email === "admin@nu.edu.eg") redirect("/admin");
  redirect("/polls");
}
