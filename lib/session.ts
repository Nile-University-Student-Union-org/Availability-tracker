import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Request-scoped cached session getter for Server Components and Route Handlers.
 * Calling this across Layout, Page, and metadata functions within the same HTTP request
 * will only execute the Better Auth database lookup ONCE.
 */
export const getCachedSession = cache(async () => {
  const reqHeaders = await headers();
  return auth.api.getSession({ headers: reqHeaders });
});
