"use client"

import { createAuthClient } from "better-auth/react"
import { siweClient } from "better-auth/client/plugins"
import { stripeClient } from "@better-auth/stripe/client"

export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
  plugins: [
    siweClient(),
    stripeClient({
      subscription: true,
    }),
  ],
})

export const { useSession, signIn, signOut } = authClient
