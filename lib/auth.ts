import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

const getAuthURL = () => {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  return process.env.NODE_ENV === "production"
    ? "https://availability-tracker.vercel.app"
    : "http://localhost:3000"
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: getAuthURL(),
  trustedOrigins: [
    "https://availability-tracker.vercel.app",
    "http://localhost:3000",
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  advanced: {
    cookieOptions: {
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    cookies: {
      session_token: {
        attributes: {
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          partitioned: true,
        },
      },
    },
  },
})
