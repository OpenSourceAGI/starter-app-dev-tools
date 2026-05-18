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

  // ── /auth/login landing page ──────────────────────────────────────────────
  // Show a branded sign-in page rather than jumping straight to Google so
  // users know which app they are authenticating into.
  if (url.pathname === "/auth/login" && request.method === "GET" && !url.searchParams.has("direct")) {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${url.origin}/auth/callback`,
      response_type: "code",
      scope: "openid email profile",
      prompt: "select_account",
    });
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sign in — code-server</title>
  <style>
    body{font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;
         display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .card{background:#161b22;border:1px solid #30363d;border-radius:12px;
          padding:2.5rem;max-width:380px;width:100%;text-align:center}
    h1{margin:0 0 .5rem;font-size:1.4rem}
    p{color:#8b949e;margin:0 0 2rem;font-size:.9rem}
    .google-btn{display:inline-flex;align-items:center;gap:.75rem;background:#fff;color:#3c4043;
                border-radius:6px;padding:.65rem 1.5rem;text-decoration:none;font-size:.95rem;
                font-weight:500;border:1px solid #dadce0}
    .google-btn:hover{background:#f8f8f8;box-shadow:0 1px 3px rgba(0,0,0,.2)}
    .google-logo{width:20px;height:20px;flex-shrink:0}
  </style>
</head>
<body>
  <div class="card">
    <h1>Sign in to code-server</h1>
    <p>Your personal cloud IDE — one container, fully isolated.</p>
    <a class="google-btn" href="${googleUrl}">
      <svg class="google-logo" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.7 2.4 30.2 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.8 6C12.4 13 17.8 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
        <path fill="#FBBC05" d="M10.6 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.8 10.7l7.8-6z"/>
        <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.6 2.2-7.7 2.2-6.2 0-11.5-4.2-13.4-9.8l-7.8 6C6.7 42.6 14.7 48 24 48z"/>
      </svg>
      Sign in with Google
    </a>
  </div>
</body>
</html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // ── /auth/login?direct — skip landing page, redirect straight to Google ──
  if (url.pathname === "/auth/login" && url.searchParams.has("direct")) {
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

    // Redirect to /setup so users see their password before code-server prompts for it.
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/setup",
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
