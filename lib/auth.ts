import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

const DEFAULT_PROD_URL = "https://nusu-availability-tracker.vercel.app";

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

  origins.add("https://nusu-availability-tracker.vercel.app");
  origins.add("https://availability-tracker.vercel.app");
  origins.add("http://localhost:3000");
  origins.add("http://127.0.0.1:3000");

  const configuredOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  for (const origin of configuredOrigins ?? []) {
    origins.add(origin);
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
  user: {
    additionalFields: {
      nuId: {
        type: "string",
        required: false,
        input: true,
      },
      committee: {
        type: "string",
        required: false,
        input: true,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
      mustResetPassword: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          user.email = user.email.trim().toLowerCase();
          if (!user.email.endsWith("@nu.edu.eg")) {
            throw new APIError("BAD_REQUEST", {
              message: "Only @nu.edu.eg emails are allowed",
            });
          }
          const nuId = (user as Record<string, unknown>).nuId;
          if (
            typeof nuId === "string" &&
            nuId.trim() &&
            !/^\d{9}$/.test(nuId.trim())
          ) {
            throw new APIError("BAD_REQUEST", {
              message: "NU ID must be exactly 9 digits",
            });
          }
          const { isAdminEmail } = await import("@/lib/admin");
          if (await isAdminEmail(user.email)) {
            user.role = "admin";
          }
        },
      },
    },
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== "false",
    window: 60,
    max: 1000,
    storage: "memory",
    customRules: {
      "/sign-in/*": {
        window: 60,
        max: 30,
      },
      "/sign-up/*": {
        window: 60,
        max: 30,
      },
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip", "cf-connecting-ip"],
    },
  },
});
