# vscode-cloud

Per-user [code-server](https://github.com/coder/code-server) instances on Cloudflare Containers — one isolated VS Code environment per authenticated user, with workspace files persisted to R2 via FUSE and GitHub repos auto-cloned on first boot.

## Architecture

```
Browser
  │
  ▼
Worker (auth + routing)
  ├─ CF Access JWT  ─────────┐
  ├─ Google OAuth session ───┤──▶ AuthUser { email, userId }
  └─ Dev mode header ────────┘
          │
          ▼
  Durable Object (per user, named by userId)
    ├─ SQLite: password, userId
    └─ Container (code-server on :8080)
         ├─ geesefs FUSE → R2: users/{userId}/
         └─ git clone → GITHUB_REPOS
```

- **One Durable Object + Container per user** — fully isolated VS Code environments keyed by sanitised email.
- **R2 workspace persistence** — geesefs mounts the R2 bucket at `/workspace` via FUSE; reads/writes sync automatically.
- **GitHub repo auto-cloning** — set `GITHUB_REPOS` to clone repos into the workspace on container start.
- **Two auth modes** — Cloudflare Access (enterprise) or Google OAuth (simpler setup), with dev-mode fallback.
- **Secure random passwords** — 24-char base-62 string generated via Web Crypto on first boot, stored in DO SQLite.
- **Idle cost control** — containers sleep after configurable inactivity (`SLEEP_AFTER`); `renewActivityTimeout()` keeps them alive while the browser tab is open.

---

## Quick start (dev mode)

```bash
npm install
wrangler login
wrangler r2 bucket create vscode-cloud-workspaces
wrangler deploy
```

With `TEAM_DOMAIN`, `POLICY_AUD`, and `GOOGLE_CLIENT_ID` all empty, auth falls back to the `x-user-id` header or `?user=` query param. **Local testing only.**

```
https://vscode-cloud.<your-subdomain>.workers.dev/setup?user=alice
```

Copy the generated password, click **Open code-server**.

---

## Auth option A — Cloudflare Access

Best for teams already using Cloudflare One. Validates the `Cf-Access-Jwt-Assertion` JWT from Access.

### 1. Create an Access application

1. [Cloudflare One](https://one.dash.cloudflare.com/) → **Access** → **Applications** → **Add** → **Self-hosted**
2. Set the domain to your Worker route (e.g. `code.example.com`)
3. Add an Allow policy (e.g. emails in `@yourcompany.com`)
4. Copy the **AUD tag** from the Basic information tab

### 2. Configure

```jsonc
// wrangler.jsonc
"vars": {
  "TEAM_DOMAIN": "https://yourteam.cloudflareaccess.com",
  "POLICY_AUD":  "your-aud-tag"
}
```

### 3. Deploy

```bash
wrangler deploy
```

---

## Auth option B — Google OAuth

Simpler for public-facing apps. Stores 7-day sessions in KV.

### 1. Create OAuth credentials

[console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → **Create OAuth 2.0 Client ID**

- Application type: **Web application**
- Authorised redirect URI: `https://vscode-cloud.<subdomain>.workers.dev/auth/callback`

### 2. Create the KV namespace

```bash
wrangler kv namespace create SESSION_STORE
# Paste the returned id into wrangler.jsonc → kv_namespaces[0].id
```

### 3. Configure

```jsonc
// wrangler.jsonc
"vars": {
  "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com"
}
```

```bash
wrangler secret put GOOGLE_CLIENT_SECRET
```

### 4. Deploy

```bash
wrangler deploy
```

Users hit `/auth/login` to authenticate, then get their `/setup` password page.

---

## R2 workspace persistence

Each user's workspace lives at `users/{userId}/` inside the shared R2 bucket, FUSE-mounted at `/home/coder/workspace` via [geesefs](https://github.com/yandex-cloud/geesefs).

### Setup

```bash
# Create bucket
wrangler r2 bucket create vscode-cloud-workspaces

# Generate an R2 API token at dash.cloudflare.com → R2 → Manage R2 API tokens
# Give it Object Read & Write on vscode-cloud-workspaces
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
wrangler secret put R2_ACCOUNT_ID   # your Cloudflare account ID
```

Without these secrets the container falls back to an ephemeral local workspace (lost on restart).

### FUSE performance tuning

The entrypoint mounts with `--attr-cache-ttl 60s --type-cache-ttl 60s` to reduce metadata round-trips. The container also writes a `.vscode/settings.json` on first boot:

```json
{
  "files.watcherExclude": { "**/.git/objects/**": true, "**/node_modules/**": true },
  "search.followSymlinks": false
}
```

This prevents the file watcher from hammering the FUSE mount on large repos.

---

## GitHub repo auto-cloning

Set `GITHUB_REPOS` to a comma-separated list of `owner/repo` pairs. On each container start the entrypoint clones any repo that isn't already present, or pulls the latest if it is.

```jsonc
// wrangler.jsonc
"vars": {
  "GITHUB_REPOS": "myorg/frontend,myorg/api"
}
```

For private repos:

```bash
wrangler secret put GITHUB_TOKEN   # PAT with repo scope
```

Repos are cloned with `--depth=50` into `/home/coder/workspace/<repo-name>/`. Because the workspace is R2-backed, the clone only runs once per user — subsequent container starts pull instead.

---

## Endpoints

| Path | Auth | Description |
|------|------|-------------|
| `GET /health` | None | Uptime check — returns `{ status: "ok" }` |
| `GET /auth/login` | None | Google OAuth — redirect to consent screen |
| `GET /auth/callback` | None | Google OAuth — exchange code, set session cookie |
| `GET /auth/logout` | None | Google OAuth — clear session, redirect to login |
| `GET /setup` | Auth | Show the user's unique password (first-visit page) |
| `POST /reset-password` | Auth | Regenerate password, reboot container, redirect to `/setup` |
| `GET /*` | Auth | Proxied to the user's code-server instance |

---

## Configuration reference

### Environment variables (`wrangler.jsonc` vars)

| Variable | Default | Description |
|----------|---------|-------------|
| `SLEEP_AFTER` | `"30m"` | Container idle timeout. Supports `"30s"`, `"1h"`, etc. Max 24h |
| `TEAM_DOMAIN` | `""` | Auth option A — CF Access team URL |
| `POLICY_AUD` | `""` | Auth option A — Access AUD tag |
| `GOOGLE_CLIENT_ID` | `""` | Auth option B — Google OAuth client ID |
| `R2_BUCKET_NAME` | `"vscode-cloud-workspaces"` | R2 bucket name |
| `GITHUB_REPOS` | `""` | Comma-separated `owner/repo` list to clone |

### Secrets (`wrangler secret put`)

| Secret | Description |
|--------|-------------|
| `R2_ACCESS_KEY_ID` | R2 API token key |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (option B) |
| `GITHUB_TOKEN` | GitHub PAT for private repos |

### Container sizing

Set in `wrangler.jsonc` → `containers[].instance_type`:

| Type | vCPU | RAM | Cost/hr | Use case |
|------|------|-----|---------|---------|
| `basic` | 0.5 | 512 MB | ~$0.15 | Light use only |
| `standard-1` | 1 | 2 GB | ~$0.30 | **Default — works well** |
| `standard-2` | 2 | 4 GB | ~$0.60 | Heavier projects / monorepos |

---

## Cost estimates

Containers are **on-demand** by default — billed only while running, ~$0 while sleeping.

| Scenario | Est. monthly cost |
|----------|------------------|
| 1 user, always-on (standard-1) | ~$75 |
| 10 users, 2hr/day avg (standard-1) | ~$18 |
| 100 users, 1hr/day avg (standard-1) | ~$80 |

Add $5/mo for Workers Paid plan + ~$10 for KV/R2 usage at scale.

Check container status:
```bash
npx wrangler containers list --status
```

---

## Resetting a password

```bash
curl -X POST https://code.example.com/reset-password \
  -H "Cf-Access-Jwt-Assertion: <token>"
  # or pass the __session cookie for Google OAuth
```

This deletes the stored password from SQLite, stops the container, then redirects to `/setup` where the new password is shown. The container restarts fresh on next request.

---

## Local development

```bash
npm run dev      # wrangler dev (no real containers; simulates Workers runtime)
npm run build    # type-check only
```

In `wrangler dev`, leave all auth vars empty and use `?user=yourname` to switch between simulated users.
