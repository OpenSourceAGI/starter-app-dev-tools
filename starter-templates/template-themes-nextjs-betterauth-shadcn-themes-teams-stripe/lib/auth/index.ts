import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { oneTap, openAPI, magicLink, anonymous } from "better-auth/plugins";
import { db } from "../db";
import * as schema from "../db/schema";
import { Resend } from "resend";
import { APP_NAME, APP_EMAIL, NEXT_PUBLIC_BASE_URL } from "../constants";
import { env } from "../../env";

async function authBuilder() {
  return betterAuth({
    baseURL: NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID || "",
        clientSecret: env.GOOGLE_CLIENT_SECRET || "",
      },
    },
    emailVerification: {
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
    },
    plugins: [
      oneTap(),
      openAPI(),
      anonymous(),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const resend = new Resend(process.env.AUTH_RESEND_KEY);
          await resend.emails.send({
            from: `${APP_NAME} <${APP_EMAIL || "noreply@example.com"}>`,
            to: email,
            subject: `Sign in to ${APP_NAME}`,
            html: `<p>Click the link below to sign in to ${APP_NAME}:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 5 minutes.</p>`,
          });
        },
        expiresIn: 300,
        disableSignUp: false,
      }),
    ],
  });
}

// Singleton — created on first request so CF context is available
let authInstance: Awaited<ReturnType<typeof authBuilder>> | null = null;

export async function initAuth() {
  if (!authInstance) {
    authInstance = await authBuilder();
  }
  return authInstance!;
}

// Export auth for backward compatibility with existing API routes
export const auth = await authBuilder();
