import { jwtVerify, createRemoteJWKSet } from "jose";
import type { Env } from "./index";

export interface AuthUser {
  /** Stable user identity — email from the JWT or Google session */
  email: string;
  /** Safe filesystem/DO key derived from email */
  userId: string;
  /** Raw subject claim */
  sub: string;
}

/**
 * Sanitise an email into a safe Durable Object name and filesystem key.
 * e.g. "alexa@example.com" → "alexa_example_com"
 */
export function emailToUserId(email: string): string {
  return email
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 64);
}

/**
 * Handle Google OAuth routes (/auth/login, /auth/callback, /auth/logout).
 * Returns a Response if the path matches, or null to continue normal routing.
 * Only active when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + SESSION_STORE are configured.
 */
export async function handleAuthRoutes(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.SESSION_STORE) return null;

  // ── /auth/login — redirect to Google consent screen ─────────────────────
  if (url.pathname === "/auth/login" && request.method === "GET") {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${url.origin}/auth/callback`,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
    });
    return Response.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      302
    );
  }

  // ── /auth/callback — exchange code for tokens, create session ────────────
  if (url.pathname === "/auth/callback") {
    const code = url.searchParams.get("code");
    if (!code) return new Response("Missing code", { status: 400 });

    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${url.origin}/auth/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResp.ok) {
      return new Response("Token exchange failed", { status: 401 });
    }

    const tokens = (await tokenResp.json()) as { id_token?: string };
    if (!tokens.id_token) return new Response("No ID token returned", { status: 401 });

    // Payload is trusted — we fetched this token directly from Google's endpoint,
    // not from the user. Full signature verification isn't needed here.
    const [, b64] = tokens.id_token.split(".");
    const claims = JSON.parse(
      atob(b64.replace(/-/g, "+").replace(/_/g, "/"))
    ) as { email: string; sub: string };

    const sessionId = crypto.randomUUID();
    const ttl = 60 * 60 * 24 * 7; // 7 days
    await env.SESSION_STORE.put(
      `session:${sessionId}`,
      JSON.stringify({ email: claims.email, sub: claims.sub }),
      { expirationTtl: ttl }
    );

    // Redirect to / — the Worker proxies straight to code-server (no password page needed).
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": `__session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttl}`,
      },
    });
  }

  // ── /auth/logout — clear session ─────────────────────────────────────────
  if (url.pathname === "/auth/logout") {
    const sessionId = getCookie(request, "__session");
    if (sessionId) await env.SESSION_STORE.delete(`session:${sessionId}`);
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/auth/login",
        "Set-Cookie": "__session=; Path=/; HttpOnly; Max-Age=0",
      },
    });
  }

  return null;
}

/**
 * Authenticate the request.  Priority order:
 *   1. Cloudflare Access JWT  (TEAM_DOMAIN + POLICY_AUD set)
 *   2. Google OAuth session   (GOOGLE_CLIENT_ID + SESSION_STORE set)
 *   3. Dev mode header/query  (local testing fallback)
 *
 * Returns an AuthUser on success, or a Response (redirect / 403) on failure.
 */
export async function authenticate(
  request: Request,
  env: Env
): Promise<AuthUser | Response> {
  if (env.TEAM_DOMAIN && env.POLICY_AUD) {
    return authenticateViaAccess(request, env);
  }

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_STORE) {
    return authenticateViaGoogleSession(request, env);
  }

  // Dev mode — accept any x-user-id header or ?user= query param
  const rawId =
    request.headers.get("x-user-id") ??
    new URL(request.url).searchParams.get("user") ??
    "dev-user";
  const email = `${rawId}@dev.local`;
  return { email, userId: emailToUserId(email), sub: rawId };
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function authenticateViaAccess(
  request: Request,
  env: Env
): Promise<AuthUser | Response> {
  const token =
    request.headers.get("cf-access-jwt-assertion") ??
    getCookie(request, "CF_Authorization");

  if (!token) {
    return new Response("Unauthorized: missing Cloudflare Access token", {
      status: 403,
      headers: { "Content-Type": "text/plain" },
    });
  }

  try {
    const JWKS = createRemoteJWKSet(
      new URL(`${env.TEAM_DOMAIN}/cdn-cgi/access/certs`)
    );
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: env.TEAM_DOMAIN,
      audience: env.POLICY_AUD,
    });
    const email = (payload.email as string) ?? payload.sub ?? "unknown";
    return {
      email,
      userId: emailToUserId(email),
      sub: String(payload.sub ?? email),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(`Unauthorized: ${msg}`, {
      status: 403,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function authenticateViaGoogleSession(
  request: Request,
  env: Env
): Promise<AuthUser | Response> {
  const sessionId = getCookie(request, "__session");
  if (!sessionId) {
    return Response.redirect(new URL("/auth/login", request.url).toString(), 302);
  }

  const data = await env.SESSION_STORE!.get(`session:${sessionId}`);
  if (!data) {
    // Expired or invalid — clear cookie and redirect
    return new Response(null, {
      status: 302,
      headers: {
        Location: new URL("/auth/login", request.url).toString(),
        "Set-Cookie": "__session=; Path=/; HttpOnly; Max-Age=0",
      },
    });
  }

  const { email, sub } = JSON.parse(data) as { email: string; sub: string };
  return { email, userId: emailToUserId(email), sub };
}

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
