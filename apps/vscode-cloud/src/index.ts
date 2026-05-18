import { Container } from "@cloudflare/containers";
import type { StopParams } from "@cloudflare/containers";
import { authenticate, handleAuthRoutes } from "./auth";

// ─── Env ─────────────────────────────────────────────────────────────────────

export interface Env {
  CODE_SERVER: DurableObjectNamespace;

  // ── Cloudflare Access (production — option A) ─────────────────────────────
  /** e.g. https://yourteam.cloudflareaccess.com  —  set via wrangler var */
  TEAM_DOMAIN?: string;
  /** Application Audience tag from the Access dashboard — set via wrangler var */
  POLICY_AUD?: string;

  // ── Google OAuth (production — option B) ─────────────────────────────────
  /** Google OAuth client ID — set via wrangler var */
  GOOGLE_CLIENT_ID?: string;
  /** Google OAuth client secret — set via wrangler secret */
  GOOGLE_CLIENT_SECRET?: string;
  /** KV namespace for storing Google OAuth sessions (7-day TTL) */
  SESSION_STORE?: KVNamespace;

  // ── Container behaviour ───────────────────────────────────────────────────
  /** How long to keep container alive after last request. Default: 30m */
  SLEEP_AFTER: string;

  // ── R2 workspace storage ─────────────────────────────────────────────────
  /** R2 bucket binding — used to verify the bucket exists at deploy time */
  WORKSPACE_BUCKET: R2Bucket;
  /** R2 API token access key (wrangler secret) — passed to container for FUSE mount */
  R2_ACCESS_KEY_ID?: string;
  /** R2 API token secret key (wrangler secret) — passed to container for FUSE mount */
  R2_SECRET_ACCESS_KEY?: string;
  /** Cloudflare account ID (wrangler secret) — needed for the R2 S3-compat endpoint */
  R2_ACCOUNT_ID?: string;
  /** R2 bucket name (wrangler var) */
  R2_BUCKET_NAME: string;

  // ── GitHub repo auto-cloning ──────────────────────────────────────────────
  /** Comma-separated list of "owner/repo" pairs to clone on container start */
  GITHUB_REPOS?: string;
  /** GitHub personal access token for private repos (wrangler secret) */
  GITHUB_TOKEN?: string;
}

// ─── Container / Durable Object ──────────────────────────────────────────────

/**
 * One CodeServerContainer instance = one isolated code-server per user.
 *
 * Responsibilities:
 *  - Generate and persist a cryptographically random password per user in SQLite.
 *  - Inject that password + R2/GitHub credentials as env vars on container start.
 *  - Expose internal RPC endpoints for the Worker (init, password, reset).
 *  - Forward all other requests to code-server, renewing the idle timer each time.
 */
export class CodeServerContainer extends Container<Env> {
  defaultPort = 8080;
  // Containers need internet to reach R2's HTTPS endpoint and github.com for cloning.
  enableInternet = true;

  constructor(ctx: DurableObjectState<SqlStorage>, env: Env) {
    super(ctx, env);
    this.sleepAfter = env.SLEEP_AFTER ?? "30m";
  }

  // ── SQLite helpers ─────────────────────────────────────────────────────────

  private initSchema(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS user_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  private getConfig(key: string): string | null {
    try {
      const rows = [
        ...this.ctx.storage.sql.exec(
          "SELECT value FROM user_config WHERE key = ?",
          key
        ),
      ];
      return rows.length > 0 ? (rows[0].value as string) : null;
    } catch {
      // Table doesn't exist yet — return null so callers fall back to defaults.
      return null;
    }
  }

  private setConfig(key: string, value: string): void {
    this.ctx.storage.sql.exec(
      `INSERT INTO user_config (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      key,
      value
    );
  }

  /**
   * Return the user's password, generating a secure random one on first call.
   * Uses base-62 chars (A-Z a-z 0-9) so it's safe for shell env vars and URLs.
   */
  private getOrCreatePassword(): string {
    this.initSchema();

    const stored = this.getConfig("password");
    if (stored) return stored;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const password = Array.from(bytes)
      .map((b) => chars[b % chars.length])
      .join("");

    this.setConfig("password", password);
    return password;
  }

  // ── Lifecycle hooks ────────────────────────────────────────────────────────

  override onStart(): void {
    console.log(`[code-server] Container started — DO id: ${this.ctx.id}`);
  }

  override onStop(_: StopParams): void {
    console.log(`[code-server] Container stopped — DO id: ${this.ctx.id}`);
  }

  override onError(error: unknown): void {
    console.error(`[code-server] Container error:`, error);
  }

  // ── Request handler ────────────────────────────────────────────────────────

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // ── Internal RPC: register userId for this DO (idempotent) ───────────────
    if (url.pathname === "/__internal/init" && request.method === "POST") {
      const { userId } = (await request.json()) as { userId: string };
      this.initSchema();
      this.setConfig("user_id", userId);
      return Response.json({ ok: true });
    }

    // ── Internal RPC: retrieve the current password ───────────────────────────
    if (url.pathname === "/__internal/password") {
      return Response.json({ password: this.getOrCreatePassword() });
    }

    // ── Internal RPC: reset password and restart container ────────────────────
    if (url.pathname === "/__internal/reset-password" && request.method === "POST") {
      this.initSchema();
      this.ctx.storage.sql.exec("DELETE FROM user_config WHERE key = 'password'");
      try { await this.stop(); } catch { /* already stopped */ }
      return Response.json({ ok: true });
    }

    // ── Internal RPC: container health / state ────────────────────────────────
    if (url.pathname === "/__internal/state") {
      const state = await this.getState();
      return Response.json(state);
    }

    // ── Proxy to code-server ──────────────────────────────────────────────────
    // Renew idle timer on every proxied request so an active browser session
    // keeps the container alive even if sleepAfter would fire.
    this.renewActivityTimeout();

    const userId = this.getConfig("user_id") ?? "default";
    const password = this.getOrCreatePassword();

    this.envVars = {
      PASSWORD: password,
      R2_ACCESS_KEY_ID: this.env.R2_ACCESS_KEY_ID ?? "",
      R2_SECRET_ACCESS_KEY: this.env.R2_SECRET_ACCESS_KEY ?? "",
      R2_ACCOUNT_ID: this.env.R2_ACCOUNT_ID ?? "",
      R2_BUCKET_NAME: this.env.R2_BUCKET_NAME ?? "",
      USER_ID: userId,
      GITHUB_REPOS: this.env.GITHUB_REPOS ?? "",
      GITHUB_TOKEN: this.env.GITHUB_TOKEN ?? "",
    };

    return super.fetch(request);
  }
}

// ─── Worker entry point ───────────────────────────────────────────────────────

function setupPage(email: string, password: string, sleepAfter: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>code-server — setup</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;
         display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .card{background:#161b22;border:1px solid #30363d;border-radius:12px;
          padding:2rem 2.5rem;max-width:480px;width:100%}
    h1{margin:0 0 .25rem;font-size:1.25rem}
    .sub{color:#8b949e;margin:0 0 1.75rem;font-size:.9rem}
    .label{font-size:.75rem;color:#8b949e;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.4rem}
    .pw{font-family:monospace;font-size:1.1rem;background:#0d1117;border:1px solid #30363d;
        border-radius:6px;padding:.6rem 1rem;letter-spacing:.08em;color:#58a6ff;user-select:all;
        display:flex;justify-content:space-between;align-items:center;gap:.5rem}
    .pw span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .copy-btn{background:#21262d;border:1px solid #30363d;color:#e6edf3;border-radius:4px;
              padding:.2rem .6rem;font-size:.75rem;cursor:pointer;white-space:nowrap;flex-shrink:0}
    .copy-btn:hover{background:#30363d}
    .note{margin-top:1rem;font-size:.82rem;color:#8b949e;line-height:1.5}
    .actions{display:flex;gap:.75rem;margin-top:1.5rem;flex-wrap:wrap}
    .btn{display:inline-flex;align-items:center;background:#238636;color:#fff;border-radius:6px;
         padding:.55rem 1.25rem;text-decoration:none;font-size:.9rem;border:none;cursor:pointer}
    .btn:hover{background:#2ea043}
    .btn-ghost{background:transparent;border:1px solid #30363d;color:#e6edf3}
    .btn-ghost:hover{background:#21262d}
    .badge{display:inline-block;background:#21262d;border:1px solid #30363d;border-radius:4px;
           padding:.15rem .5rem;font-size:.75rem;color:#8b949e;margin-left:.5rem}
    .logout{float:right;font-size:.8rem;color:#8b949e;text-decoration:none}
    .logout:hover{color:#e6edf3}
    hr{border:none;border-top:1px solid #21262d;margin:1.5rem 0}
  </style>
</head>
<body>
  <div class="card">
    <a class="logout" href="/auth/logout">Sign out</a>
    <h1>Your cloud IDE is ready <span class="badge">starting…</span></h1>
    <p class="sub">Signed in as <strong>${email}</strong></p>

    <div class="label">Your unique password</div>
    <div class="pw">
      <span id="pw">${password}</span>
      <button class="copy-btn" onclick="copyPw()">Copy</button>
    </div>
    <p class="note">
      This password is unique to you — it never changes unless you request a reset.
      The IDE sleeps after <strong>${sleepAfter}</strong> of inactivity to save cost
      and wakes automatically on your next visit.
    </p>

    <div class="actions">
      <a class="btn" href="/" onclick="navigator.clipboard?.writeText('${password}')">
        Copy &amp; open IDE &rarr;
      </a>
      <form method="POST" action="/reset-password" style="margin:0">
        <button type="submit" class="btn btn-ghost">Reset password</button>
      </form>
    </div>

    <hr>
    <p class="note" style="margin:0">
      <strong>GitHub repos</strong> configured for auto-clone are loaded into
      <code>/home/coder/workspace/</code> on first boot. Workspace changes sync
      automatically to R2 via FUSE.
    </p>
  </div>
  <script>
    function copyPw() {
      navigator.clipboard?.writeText(document.getElementById('pw').textContent ?? '');
      const btn = document.querySelector('.copy-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    }
  </script>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── Health check (unauthenticated) ──────────────────────────────────────
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", ts: Date.now() });
    }

    // ── Google OAuth routes (login / callback / logout) ─────────────────────
    // Must run before authenticate() so unauthenticated users can reach /auth/login
    const authRouteResp = await handleAuthRoutes(request, env, url);
    if (authRouteResp) return authRouteResp;

    // ── Authenticate via CF Access JWT, Google session, or dev header ────────
    const authResult = await authenticate(request, env);
    if (authResult instanceof Response) return authResult;

    const { email, userId } = authResult;

    // ── Route to the user's personal container instance ─────────────────────
    const stub = env.CODE_SERVER.getByName(userId) as unknown as {
      fetch(req: Request): Promise<Response>;
    };

    // Register userId in the DO's SQLite so it can build the R2 prefix.
    // This is idempotent and cheap (a single SQL upsert).
    await stub.fetch(
      new Request("http://internal/__internal/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
    );

    // ── /setup — password reveal + first-visit instructions ──────────────────
    if (url.pathname === "/setup") {
      const pwResp = await stub.fetch(
        new Request("http://internal/__internal/password")
      );
      const { password } = (await pwResp.json()) as { password: string };
      return setupPage(email, password, env.SLEEP_AFTER ?? "30m");
    }

    // ── /reset-password — regenerate password (POST only) ───────────────────
    if (url.pathname === "/reset-password" && request.method === "POST") {
      await stub.fetch(
        new Request("http://internal/__internal/reset-password", {
          method: "POST",
        })
      );
      return Response.redirect(new URL("/setup", url).toString(), 303);
    }

    // ── /status — container state (JSON) ────────────────────────────────────
    if (url.pathname === "/status") {
      const stateResp = await stub.fetch(
        new Request("http://internal/__internal/state")
      );
      const state = await stateResp.json();
      return Response.json({ userId, email, container: state });
    }

    // ── Proxy everything else to code-server ─────────────────────────────────
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
