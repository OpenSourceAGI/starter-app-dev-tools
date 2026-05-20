/// <reference types="@cloudflare/workers-types" />
import { Container } from "@cloudflare/containers";
import type { StopParams } from "@cloudflare/containers";
import { authenticate, handleAuthRoutes } from "./auth";
import { handleAdminRoutes } from "./admin";

// ─── Env ─────────────────────────────────────────────────────────────────────

export interface Env {
  CODE_SERVER: DurableObjectNamespace;

  // ── Cloudflare Access (option A) ──────────────────────────────────────────
  TEAM_DOMAIN?: string;
  POLICY_AUD?: string;

  // ── Google OAuth (option B) ───────────────────────────────────────────────
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SESSION_STORE?: KVNamespace;

  // ── Teams ─────────────────────────────────────────────────────────────────
  /** D1 database for teams, members, and invites */
  TEAMS_DB?: D1Database;
  /** Comma-separated emails with platform-wide admin access to /admin */
  ADMIN_EMAILS?: string;

  // ── Container behaviour ───────────────────────────────────────────────────
  SLEEP_AFTER: string;

  // ── R2 workspace storage ──────────────────────────────────────────────────
  WORKSPACE_BUCKET: R2Bucket;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME: string;

  // ── GitHub repo auto-cloning ──────────────────────────────────────────────
  GITHUB_REPOS?: string;
  GITHUB_TOKEN?: string;

  // ── WakaTime ──────────────────────────────────────────────────────────────
  /** Optional: auto-configure WakaTime API key in every container (~/.wakatime.cfg) */
  WAKATIME_API_KEY?: string;
}

// ─── Container / Durable Object ──────────────────────────────────────────────

export class CodeServerContainer extends Container<Env> {
  defaultPort = 8080;
  enableInternet = true;

  constructor(ctx: DurableObjectState<SqlStorage>, env: Env) {
    super(ctx, env);
    this.sleepAfter = env.SLEEP_AFTER ?? "30m";
  }

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

  override onStart(): void {
    console.log(`[code-server] started — ${this.ctx.id}`);
  }

  override onStop(_: StopParams): void {
    console.log(`[code-server] stopped — ${this.ctx.id}`);
  }

  override onError(error: unknown): void {
    console.error(`[code-server] error:`, error);
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__internal/init" && request.method === "POST") {
      const { userId } = (await request.json()) as { userId: string };
      this.initSchema();
      this.setConfig("user_id", userId);
      return Response.json({ ok: true });
    }

    if (url.pathname === "/__internal/state") {
      return Response.json(await this.getState());
    }

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
      WAKATIME_API_KEY: this.env.WAKATIME_API_KEY ?? "",
    };

    return super.fetch(request);
  }
}

// ─── Landing page ─────────────────────────────────────────────────────────────

function landingPage(env: Env): Response {
  const hasGoogleAuth = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const hasCFAccess = !!(env.TEAM_DOMAIN && env.POLICY_AUD);

  const signInHref = hasGoogleAuth
    ? "/auth/login"
    : hasCFAccess
    ? "/"
    : "/?user=dev";
  const signInLabel = hasGoogleAuth
    ? "Sign in with Google"
    : hasCFAccess
    ? "Sign in"
    : "Open IDE (dev mode)";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Cloud IDE — VS Code for every developer</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d1117; --surface: #161b22; --border: #30363d;
      --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
      --green: #238636; --green-h: #2ea043; --purple: #a371f7;
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
    .logo { font-size: 1rem; font-weight: 700; color: var(--text); text-decoration: none; }
    .logo span { color: var(--accent); }
    .nav-action { font-size: .875rem; }
    .nav-action a { color: var(--muted); text-decoration: none; }
    .nav-action a:hover { color: var(--text); }
    main { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 0 1.5rem; }

    /* ── Hero ── */
    .hero { text-align: center; padding: 5rem 0 3.5rem; max-width: 640px; width: 100%; }
    .hero-badge {
      display: inline-block; background: #1a1f2e; border: 1px solid #2d3754;
      border-radius: 999px; padding: .25rem 1rem;
      font-size: .75rem; color: var(--accent); letter-spacing: .04em; margin-bottom: 1.5rem;
    }
    h1 {
      font-size: clamp(2.2rem, 5vw, 3.5rem); font-weight: 700;
      line-height: 1.12; margin-bottom: 1.1rem; letter-spacing: -.03em;
    }
    h1 em { font-style: normal; color: var(--accent); }
    .hero-sub {
      font-size: 1.1rem; color: var(--muted); line-height: 1.7; margin-bottom: 2.5rem;
    }
    .hero-actions { display: flex; gap: .75rem; flex-wrap: wrap; justify-content: center; }
    .btn-primary {
      background: var(--green); color: #fff; border-radius: 8px;
      padding: .7rem 1.75rem; text-decoration: none; font-size: .95rem; font-weight: 500;
    }
    .btn-primary:hover { background: var(--green-h); }
    .btn-ghost {
      background: transparent; color: var(--muted); border: 1px solid var(--border);
      border-radius: 8px; padding: .7rem 1.75rem; text-decoration: none; font-size: .95rem;
    }
    .btn-ghost:hover { background: var(--surface); color: var(--text); }

    /* ── Feature grid ── */
    .section { width: 100%; max-width: 900px; padding: 2rem 0 3.5rem; }
    .section-label {
      font-size: .72rem; text-transform: uppercase; letter-spacing: .1em;
      color: var(--muted); margin-bottom: 1.25rem;
    }
    .feature-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(195px, 1fr));
      gap: 1px; background: var(--border);
      border: 1px solid var(--border); border-radius: 12px; overflow: hidden;
    }
    .feature {
      background: var(--surface); padding: 1.4rem 1.25rem;
      display: flex; flex-direction: column; gap: .45rem;
    }
    .fi { font-size: 1.35rem; }
    .ft { font-size: .875rem; font-weight: 600; }
    .fd { font-size: .78rem; color: var(--muted); line-height: 1.55; }

    /* ── Teams CTA ── */
    .teams-cta {
      width: 100%; max-width: 900px;
      background: linear-gradient(135deg, #161b22 0%, #1a1f2e 100%);
      border: 1px solid #2d3754; border-radius: 14px;
      padding: 2.5rem 2rem; margin-bottom: 4rem;
      display: flex; gap: 2rem; align-items: center; flex-wrap: wrap;
    }
    .teams-cta-text { flex: 1; min-width: 220px; }
    .teams-cta-text h2 { font-size: 1.4rem; margin-bottom: .5rem; }
    .teams-cta-text p { color: var(--muted); font-size: .9rem; line-height: 1.6; }
    .teams-cta-pills { display: flex; flex-direction: column; gap: .5rem; min-width: 220px; }
    .pill {
      display: flex; align-items: center; gap: .6rem;
      font-size: .82rem; color: var(--muted);
    }
    .pill-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }
    .teams-cta-action { display: flex; flex-direction: column; gap: .75rem; align-items: flex-start; }
    .btn-teams {
      background: var(--purple); color: #fff; border-radius: 8px;
      padding: .7rem 1.5rem; text-decoration: none; font-size: .9rem; font-weight: 500;
      white-space: nowrap;
    }
    .btn-teams:hover { filter: brightness(1.1); }

    footer {
      border-top: 1px solid var(--border); padding: 1.5rem 2rem;
      text-align: center; font-size: .78rem; color: var(--muted);
    }
  </style>
</head>
<body>
  <nav>
    <a class="logo" href="/">Cloud <span>IDE</span></a>
    <div class="nav-action"><a href="${signInHref}">${signInLabel}</a></div>
  </nav>

  <main>
    <!-- Hero -->
    <section class="hero">
      <div class="hero-badge">Powered by Cloudflare Containers</div>
      <h1>The cloud IDE for<br><em>developer teams</em></h1>
      <p class="hero-sub">
        A full VS Code environment per developer — isolated, persistent, and
        ready in seconds. Manage your whole team from one dashboard.
      </p>
      <div class="hero-actions">
        <a class="btn-primary" href="${signInHref}">${signInLabel}</a>
        <a class="btn-ghost" href="/admin">Team dashboard</a>
      </div>
    </section>

    <!-- Developer features -->
    <div class="section">
      <div class="section-label">For developers</div>
      <div class="feature-grid">
        <div class="feature">
          <div class="fi">📦</div>
          <div class="ft">Isolated container per user</div>
          <div class="fd">Your own VS Code — no shared state, no conflicts with teammates.</div>
        </div>
        <div class="feature">
          <div class="fi">💾</div>
          <div class="ft">Workspace persisted to R2</div>
          <div class="fd">Files sync automatically to Cloudflare R2 via FUSE. Survive restarts.</div>
        </div>
        <div class="feature">
          <div class="fi">🔄</div>
          <div class="ft">GitHub repos auto-cloned</div>
          <div class="fd">Configure repos once — they appear in your workspace on first boot.</div>
        </div>
        <div class="feature">
          <div class="fi">🤖</div>
          <div class="ft">Claude Code + Codex CLI</div>
          <div class="fd">AI coding assistants pre-installed and ready in every terminal.</div>
        </div>
        <div class="feature">
          <div class="fi">🔌</div>
          <div class="ft">10+ extensions pre-installed</div>
          <div class="fd">GitLens, ESLint, Prettier, Python, Tailwind, Error Lens, and more.</div>
        </div>
        <div class="feature">
          <div class="fi">💤</div>
          <div class="ft">Idle sleep</div>
          <div class="fd">Containers hibernate after inactivity and wake instantly on return.</div>
        </div>
      </div>
    </div>

    <!-- Teams CTA -->
    <div class="teams-cta">
      <div class="teams-cta-text">
        <h2>Built for engineering teams</h2>
        <p>
          Group your developers into teams, track coding time with
          WakaTime, and onboard new members with a single invite link —
          all from a central admin dashboard.
        </p>
      </div>
      <div class="teams-cta-pills">
        <div class="pill"><span class="pill-dot"></span>Team accounts with role-based access</div>
        <div class="pill"><span class="pill-dot"></span>Admin dashboard to manage members</div>
        <div class="pill"><span class="pill-dot"></span>Invite developers by email — 7-day links</div>
        <div class="pill"><span class="pill-dot"></span>WakaTime time tracking pre-installed</div>
        <div class="pill"><span class="pill-dot"></span>Per-member container status at a glance</div>
      </div>
      <div class="teams-cta-action">
        <a class="btn-teams" href="${signInHref}">Get started free</a>
        <a class="btn-ghost" href="/admin" style="font-size:.85rem">Open dashboard</a>
      </div>
    </div>
  </main>

  <footer>
    Built on Cloudflare Containers · code-server by Coder · WakaTime time tracking
  </footer>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ─── Worker entry point ───────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", ts: Date.now() });
    }

    const authRouteResp = await handleAuthRoutes(request, env, url);
    if (authRouteResp) return authRouteResp;

    const authResult = await authenticate(request, env);

    if (authResult instanceof Response) {
      const isGoogleOAuth = !!(env.GOOGLE_CLIENT_ID && !env.TEAM_DOMAIN);
      if (isGoogleOAuth && request.method === "GET") return landingPage(env);
      return authResult;
    }

    const { email, userId } = authResult;

    // ── Admin / teams routes ─────────────────────────────────────────────────
    const adminResp = await handleAdminRoutes(request, env, url, email, userId);
    if (adminResp) return adminResp;

    // ── User's own container ─────────────────────────────────────────────────
    const stub = env.CODE_SERVER.getByName(userId) as unknown as {
      fetch(req: Request): Promise<Response>;
    };

    await stub.fetch(
      new Request("http://internal/__internal/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
    );

    if (url.pathname === "/status") {
      const r = await stub.fetch(new Request("http://internal/__internal/state"));
      return Response.json({ userId, email, container: await r.json() });
    }

    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
