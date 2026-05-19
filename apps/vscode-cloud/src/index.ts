import { Container } from "@cloudflare/containers";
import type { StopParams } from "@cloudflare/containers";
import { authenticate, handleAuthRoutes } from "./auth";

// ─── Env ─────────────────────────────────────────────────────────────────────

export interface Env {
  CODE_SERVER: DurableObjectNamespace;

  // ── Cloudflare Access (production — option A) ─────────────────────────────
  TEAM_DOMAIN?: string;
  POLICY_AUD?: string;

  // ── Google OAuth (production — option B) ─────────────────────────────────
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SESSION_STORE?: KVNamespace;

  // ── Container behaviour ───────────────────────────────────────────────────
  SLEEP_AFTER: string;

  // ── R2 workspace storage ─────────────────────────────────────────────────
  WORKSPACE_BUCKET: R2Bucket;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME: string;

  // ── GitHub repo auto-cloning ──────────────────────────────────────────────
  GITHUB_REPOS?: string;
  GITHUB_TOKEN?: string;
}

// ─── Container / Durable Object ──────────────────────────────────────────────

/**
 * One CodeServerContainer instance = one isolated code-server per user.
 * Auth is handled by the Worker — the container runs with --auth none.
 */
export class CodeServerContainer extends Container<Env> {
  defaultPort = 8080;
  // Required so the container can reach R2's S3-compat HTTPS endpoint and github.com.
  enableInternet = true;

  constructor(ctx: DurableObjectState<SqlStorage>, env: Env) {
    super(ctx, env);
    this.sleepAfter = env.SLEEP_AFTER ?? "30m";
  }

  // ── SQLite — store userId for R2 prefix ───────────────────────────────────

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

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  override onStart(): void {
    console.log(`[code-server] started — ${this.ctx.id}`);
  }

  override onStop(_: StopParams): void {
    console.log(`[code-server] stopped — ${this.ctx.id}`);
  }

  override onError(error: unknown): void {
    console.error(`[code-server] error:`, error);
  }

  // ── Request handler ────────────────────────────────────────────────────────

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // ── Internal RPC: register userId (idempotent) ───────────────────────────
    if (url.pathname === "/__internal/init" && request.method === "POST") {
      const { userId } = (await request.json()) as { userId: string };
      this.initSchema();
      this.setConfig("user_id", userId);
      return Response.json({ ok: true });
    }

    // ── Internal RPC: container state ────────────────────────────────────────
    if (url.pathname === "/__internal/state") {
      const state = await this.getState();
      return Response.json(state);
    }

    // ── Proxy to code-server ──────────────────────────────────────────────────
    this.renewActivityTimeout();

    const userId = this.getConfig("user_id") ?? "default";

    this.envVars = {
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

// ─── Landing page ─────────────────────────────────────────────────────────────

function landingPage(env: Env): Response {
  const hasGoogleAuth = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const hasCFAccess = !!(env.TEAM_DOMAIN && env.POLICY_AUD);

  const signInButton = hasGoogleAuth
    ? `<a class="btn-primary" href="/auth/login">Sign in with Google</a>`
    : hasCFAccess
    ? `<a class="btn-primary" href="/">Sign in</a>`
    : `<a class="btn-primary" href="/?user=dev">Open IDE (dev mode)</a>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cloud IDE</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d1117; --surface: #161b22; --border: #30363d;
      --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
      --green: #238636; --green-h: #2ea043;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg); color: var(--text);
      min-height: 100vh; display: flex; flex-direction: column;
    }
    nav {
      padding: 1rem 2rem; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .logo { font-size: 1rem; font-weight: 600; color: var(--text); text-decoration: none; }
    .logo span { color: var(--accent); }
    main {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 3rem 1.5rem; text-align: center;
    }
    .badge {
      display: inline-block; background: #1f2937; border: 1px solid var(--border);
      border-radius: 999px; padding: .25rem .875rem;
      font-size: .75rem; color: var(--muted); letter-spacing: .03em; margin-bottom: 1.5rem;
    }
    h1 {
      font-size: clamp(2rem, 5vw, 3.25rem); font-weight: 700;
      line-height: 1.15; margin-bottom: 1rem; letter-spacing: -.02em;
    }
    h1 em { font-style: normal; color: var(--accent); }
    .sub {
      font-size: 1.1rem; color: var(--muted); max-width: 520px;
      line-height: 1.65; margin-bottom: 2.5rem;
    }
    .actions { display: flex; gap: .75rem; flex-wrap: wrap; justify-content: center; }
    .btn-primary {
      background: var(--green); color: #fff; border-radius: 8px;
      padding: .7rem 1.75rem; text-decoration: none; font-size: .95rem; font-weight: 500;
      transition: background .15s;
    }
    .btn-primary:hover { background: var(--green-h); }
    .btn-ghost {
      background: transparent; color: var(--muted); border: 1px solid var(--border);
      border-radius: 8px; padding: .7rem 1.75rem; text-decoration: none; font-size: .95rem;
      transition: background .15s, color .15s;
    }
    .btn-ghost:hover { background: var(--surface); color: var(--text); }
    .features {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1px; background: var(--border);
      border: 1px solid var(--border); border-radius: 12px;
      overflow: hidden; max-width: 860px; width: 100%; margin-top: 4rem;
    }
    .feature {
      background: var(--surface); padding: 1.5rem 1.25rem;
      display: flex; flex-direction: column; gap: .5rem; text-align: left;
    }
    .feature-icon { font-size: 1.4rem; }
    .feature-title { font-size: .9rem; font-weight: 600; }
    .feature-desc { font-size: .8rem; color: var(--muted); line-height: 1.5; }
    footer {
      padding: 1.5rem 2rem; border-top: 1px solid var(--border);
      text-align: center; font-size: .78rem; color: var(--muted);
    }
  </style>
</head>
<body>
  <nav>
    <a class="logo" href="/">Cloud <span>IDE</span></a>
  </nav>

  <main>
    <div class="badge">Powered by Cloudflare Containers</div>
    <h1>Your personal<br><em>cloud IDE</em></h1>
    <p class="sub">
      A full VS Code environment that spins up in seconds,
      persists your work to R2, and sleeps when you're away — so you pay only while coding.
    </p>
    <div class="actions">
      ${signInButton}
      <a class="btn-ghost" href="https://github.com/coder/code-server" target="_blank" rel="noopener">
        Learn more
      </a>
    </div>

    <div class="features">
      <div class="feature">
        <div class="feature-icon">📦</div>
        <div class="feature-title">Isolated container per user</div>
        <div class="feature-desc">Every user gets their own container — no shared state, no conflicts.</div>
      </div>
      <div class="feature">
        <div class="feature-icon">💾</div>
        <div class="feature-title">Workspace persisted to R2</div>
        <div class="feature-desc">Files sync automatically to Cloudflare R2 via FUSE. Survive restarts.</div>
      </div>
      <div class="feature">
        <div class="feature-icon">🔄</div>
        <div class="feature-title">GitHub repos auto-cloned</div>
        <div class="feature-desc">Configure repos once — they appear in your workspace on first boot.</div>
      </div>
      <div class="feature">
        <div class="feature-icon">🤖</div>
        <div class="feature-title">Claude Code + Codex CLI</div>
        <div class="feature-desc">AI coding assistants pre-installed and ready in every terminal.</div>
      </div>
      <div class="feature">
        <div class="feature-icon">🔌</div>
        <div class="feature-title">Extensions pre-installed</div>
        <div class="feature-desc">GitLens, ESLint, Prettier, Python, Tailwind, and more — ready on launch.</div>
      </div>
      <div class="feature">
        <div class="feature-icon">💤</div>
        <div class="feature-title">Idle sleep — pay while coding</div>
        <div class="feature-desc">Containers hibernate after inactivity and wake instantly on your return.</div>
      </div>
    </div>
  </main>

  <footer>
    Built on Cloudflare Containers · code-server by Coder
  </footer>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// ─── Worker entry point ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ── Health check (unauthenticated) ──────────────────────────────────────
    if (url.pathname === "/health") {
      return Response.json({ status: "ok", ts: Date.now() });
    }

    // ── Google OAuth routes (login / callback / logout) ─────────────────────
    const authRouteResp = await handleAuthRoutes(request, env, url);
    if (authRouteResp) return authRouteResp;

    // ── Authenticate ─────────────────────────────────────────────────────────
    const authResult = await authenticate(request, env);

    // If not authenticated and Google OAuth is configured: show landing page
    // for GET requests instead of bouncing straight to the login redirect.
    if (authResult instanceof Response) {
      const isGoogleOAuth = !!(env.GOOGLE_CLIENT_ID && !env.TEAM_DOMAIN);
      if (isGoogleOAuth && request.method === "GET") {
        return landingPage(env);
      }
      return authResult;
    }

    const { email, userId } = authResult;

    // ── Route to the user's personal container ──────────────────────────────
    const stub = env.CODE_SERVER.getByName(userId) as unknown as {
      fetch(req: Request): Promise<Response>;
    };

    // Register userId in the DO (idempotent — one SQL upsert per request).
    await stub.fetch(
      new Request("http://internal/__internal/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
    );

    // ── /status — container state for debugging ──────────────────────────────
    if (url.pathname === "/status") {
      const stateResp = await stub.fetch(
        new Request("http://internal/__internal/state")
      );
      const state = await stateResp.json();
      return Response.json({ userId, email, container: state });
    }

    // ── Proxy to code-server ─────────────────────────────────────────────────
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
