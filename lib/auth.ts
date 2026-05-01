import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

const DEFAULT_PROD_URL = "https://availability-tracker.vercel.app";

const getAuthURL = () => {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NODE_ENV === "production"
    ? DEFAULT_PROD_URL
    : "http://localhost:3000";
};

const getTrustedOrigins = (authURL: string) => {
  const origins = new Set<string>();

  try {
    origins.add(new URL(authURL).origin);
  } catch {
    // Fallback for unexpected URL parsing issues in misconfigured environments.
  }

  const configuredOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of configuredOrigins ?? []) {
    origins.add(origin);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
  }

  return [...origins];
};

const authURL = getAuthURL();

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: authURL,
  trustedOrigins: getTrustedOrigins(authURL),
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
})
