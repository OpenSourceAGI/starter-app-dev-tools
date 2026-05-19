import type { Env } from "./index";
import type { Team, TeamMember, TeamInvite } from "./teams";
import {
  initTeamsSchema,
  createTeam,
  getAllTeams,
  getTeamsByUser,
  getTeam,
  getTeamMembers,
  getMemberRole,
  addMember,
  removeMember,
  createInvite,
  getInvite,
  getPendingInvites,
  deleteInvite,
} from "./teams";
import { emailToUserId } from "./auth";

// ─── Shared HTML shell ────────────────────────────────────────────────────────

function shell(title: string, body: string, email: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title} — Teams</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d1117; --surface: #161b22; --surface2: #1c2128; --border: #30363d;
      --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
      --green: #238636; --green-h: #2ea043; --red: #da3633; --orange: #d29922;
    }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }
    nav {
      padding: .75rem 1.5rem; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; gap: 1.5rem;
    }
    .nav-logo { font-weight: 700; color: var(--text); text-decoration: none; font-size: .95rem; }
    .nav-logo span { color: var(--accent); }
    .nav-links { display: flex; gap: 1rem; flex: 1; }
    .nav-links a { color: var(--muted); text-decoration: none; font-size: .875rem; }
    .nav-links a:hover, .nav-links a.active { color: var(--text); }
    .nav-user { font-size: .8rem; color: var(--muted); }
    .nav-user a { color: var(--muted); text-decoration: none; }
    .nav-user a:hover { color: var(--text); }
    .container { max-width: 960px; margin: 0 auto; padding: 2rem 1.5rem; }
    h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: .25rem; }
    h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; }
    .page-sub { color: var(--muted); font-size: .9rem; margin-bottom: 2rem; }
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 10px; overflow: hidden; margin-bottom: 1.5rem;
    }
    .card-header {
      padding: .875rem 1.25rem; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
    }
    .card-header h2 { margin: 0; }
    .card-body { padding: 1.25rem; }
    table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    th { text-align: left; padding: .5rem .75rem; color: var(--muted); font-weight: 500;
         font-size: .75rem; text-transform: uppercase; letter-spacing: .04em;
         border-bottom: 1px solid var(--border); }
    td { padding: .625rem .75rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--surface2); }
    .badge {
      display: inline-block; padding: .15rem .55rem; border-radius: 999px;
      font-size: .72rem; font-weight: 500; letter-spacing: .02em;
    }
    .badge-admin { background: #1d2d3e; color: var(--accent); border: 1px solid #1f4068; }
    .badge-member { background: #1c2d1f; color: #3fb950; border: 1px solid #1b4721; }
    .badge-running { background: #1c2d1f; color: #3fb950; border: 1px solid #1b4721; }
    .badge-stopped { background: #2d1f1f; color: #f85149; border: 1px solid #4d1e1e; }
    .badge-sleeping { background: #2d2a1a; color: var(--orange); border: 1px solid #4d3a0d; }
    .btn {
      display: inline-flex; align-items: center; gap: .4rem;
      padding: .4rem .9rem; border-radius: 6px; font-size: .825rem; font-weight: 500;
      text-decoration: none; border: none; cursor: pointer; transition: background .15s;
    }
    .btn-primary { background: var(--green); color: #fff; }
    .btn-primary:hover { background: var(--green-h); }
    .btn-danger { background: transparent; color: var(--red); border: 1px solid #4d1e1e; }
    .btn-danger:hover { background: #2d1f1f; }
    .btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); }
    .btn-ghost:hover { background: var(--surface2); color: var(--text); }
    .form-row { display: flex; gap: .75rem; align-items: flex-end; flex-wrap: wrap; margin-top: 1rem; }
    .form-group { display: flex; flex-direction: column; gap: .35rem; flex: 1; min-width: 200px; }
    label { font-size: .8rem; color: var(--muted); }
    input[type=text], input[type=email] {
      background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
      color: var(--text); padding: .45rem .75rem; font-size: .875rem; width: 100%;
    }
    input:focus { outline: none; border-color: var(--accent); }
    .invite-url {
      background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
      padding: .6rem .875rem; font-family: monospace; font-size: .8rem;
      color: var(--accent); word-break: break-all; margin-top: .75rem;
    }
    .empty { color: var(--muted); font-size: .875rem; padding: .75rem 0; }
    .flash {
      padding: .75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: .875rem;
    }
    .flash-ok { background: #1c2d1f; border: 1px solid #1b4721; color: #3fb950; }
    .flash-err { background: #2d1f1f; border: 1px solid #4d1e1e; color: #f85149; }
    .top-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.75rem; }
    .top-bar-title h1 { margin: 0; }
    .team-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 1rem; margin-top: 1.5rem;
    }
    .team-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
      padding: 1.25rem; display: flex; flex-direction: column; gap: .75rem;
    }
    .team-card-name { font-size: 1rem; font-weight: 600; }
    .team-card-meta { font-size: .8rem; color: var(--muted); }
    .team-card-footer { display: flex; justify-content: flex-end; }
  </style>
</head>
<body>
  <nav>
    <a class="nav-logo" href="/">Cloud <span>IDE</span></a>
    <div class="nav-links">
      <a href="/" >My IDE</a>
      <a href="/admin" class="active">Teams</a>
      <a href="/status">Status</a>
    </div>
    <span class="nav-user">${email} · <a href="/auth/logout">Sign out</a></span>
  </nav>
  <div class="container">
    ${body}
  </div>
</body>
</html>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string): string {
  const cls =
    status === "running" || status === "healthy"
      ? "badge-running"
      : status === "stopped" || status === "stopped_with_code"
      ? "badge-stopped"
      : "badge-sleeping";
  return `<span class="badge ${cls}">${status}</span>`;
}

async function getContainerStatus(
  doNs: DurableObjectNamespace,
  userId: string
): Promise<string> {
  try {
    const stub = doNs.getByName(userId) as unknown as { fetch(r: Request): Promise<Response> };
    const r = await stub.fetch(new Request("http://internal/__internal/state"));
    const state = (await r.json()) as { status?: string };
    return state?.status ?? "unknown";
  } catch {
    return "unknown";
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function handleAdminRoutes(
  request: Request,
  env: Env,
  url: URL,
  userEmail: string,
  userId: string
): Promise<Response | null> {
  if (!env.TEAMS_DB) return null;
  if (!url.pathname.startsWith("/admin")) return null;

  await initTeamsSchema(env.TEAMS_DB);

  const isGlobalAdmin =
    env.ADMIN_EMAILS
      ?.split(",")
      .map((e) => e.trim().toLowerCase())
      .includes(userEmail.toLowerCase()) ?? false;

  const path = url.pathname;
  const flash = (msg: string, ok = true) =>
    `<div class="flash ${ok ? "flash-ok" : "flash-err"}">${msg}</div>`;

  // ── GET /admin ─────────────────────────────────────────────────────────────
  if (path === "/admin" && request.method === "GET") {
    const teams = isGlobalAdmin
      ? await getAllTeams(env.TEAMS_DB)
      : await getTeamsByUser(env.TEAMS_DB, userId);

    const cards = teams.length
      ? teams
          .map(
            (t) => `
        <div class="team-card">
          <div class="team-card-name">${esc(t.name)}</div>
          <div class="team-card-meta">Created ${new Date(t.created_at).toLocaleDateString()}</div>
          <div class="team-card-footer">
            <a class="btn btn-ghost" href="/admin/team/${t.id}">Manage &rarr;</a>
          </div>
        </div>`
          )
          .join("")
      : `<p class="empty">No teams yet. Create one to get started.</p>`;

    const body = `
      <div class="top-bar">
        <div class="top-bar-title">
          <h1>Teams Dashboard</h1>
          <p class="page-sub">Manage your developer teams, track activity, and invite members.</p>
        </div>
        <a class="btn btn-primary" href="/admin/team/new">+ New Team</a>
      </div>
      <div class="team-grid">${cards}</div>`;
    return new Response(shell("Dashboard", body, userEmail), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // ── GET /admin/team/new ────────────────────────────────────────────────────
  if (path === "/admin/team/new" && request.method === "GET") {
    const body = `
      <div class="top-bar">
        <div class="top-bar-title"><h1>Create Team</h1></div>
        <a class="btn btn-ghost" href="/admin">&larr; Back</a>
      </div>
      <div class="card">
        <div class="card-body">
          <form method="POST" action="/admin/team/create">
            <div class="form-group" style="max-width:400px">
              <label for="name">Team name</label>
              <input type="text" id="name" name="name" placeholder="e.g. Frontend Team" required>
            </div>
            <div class="form-row" style="margin-top:1.25rem">
              <button type="submit" class="btn btn-primary">Create team</button>
              <a class="btn btn-ghost" href="/admin">Cancel</a>
            </div>
          </form>
        </div>
      </div>`;
    return new Response(shell("New Team", body, userEmail), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // ── POST /admin/team/create ────────────────────────────────────────────────
  if (path === "/admin/team/create" && request.method === "POST") {
    const form = await request.formData();
    const name = (form.get("name") as string | null)?.trim();
    if (!name) return redirect("/admin/team/new");
    const team = await createTeam(env.TEAMS_DB, name, userId, userEmail);
    return redirect(`/admin/team/${team.id}`);
  }

  // ── /admin/team/:id ────────────────────────────────────────────────────────
  const teamMatch = path.match(/^\/admin\/team\/([^/]+)$/);
  if (teamMatch) {
    const teamId = teamMatch[1];
    const team = await getTeam(env.TEAMS_DB, teamId);
    if (!team) return new Response("Team not found", { status: 404 });

    const role = await getMemberRole(env.TEAMS_DB, teamId, userId);
    if (!role && !isGlobalAdmin)
      return new Response("Forbidden", { status: 403 });

    const isTeamAdmin = role === "admin" || isGlobalAdmin;

    if (request.method === "POST") {
      const form = await request.formData();
      const action = form.get("_action") as string | null;

      if (action === "invite" && isTeamAdmin) {
        const email = (form.get("email") as string | null)?.trim().toLowerCase();
        if (!email) return redirect(`/admin/team/${teamId}?err=noemail`);
        const token = await createInvite(env.TEAMS_DB, teamId, email, userId);
        return redirect(`/admin/team/${teamId}?invite=${token}`);
      }

      if (action === "remove" && isTeamAdmin) {
        const targetId = form.get("member_id") as string | null;
        if (targetId && targetId !== userId)
          await removeMember(env.TEAMS_DB, teamId, targetId);
        return redirect(`/admin/team/${teamId}`);
      }
    }

    // GET — build team detail page
    const [members, invites] = await Promise.all([
      getTeamMembers(env.TEAMS_DB, teamId),
      isTeamAdmin ? getPendingInvites(env.TEAMS_DB, teamId) : Promise.resolve<TeamInvite[]>([]),
    ]);

    // Fetch container status for each member in parallel
    const statuses = await Promise.all(
      members.map((m) => getContainerStatus(env.CODE_SERVER, m.user_id))
    );

    const newInviteToken = url.searchParams.get("invite");
    const errParam = url.searchParams.get("err");

    const inviteFlash = newInviteToken
      ? flash(
          `Invite link generated — copy and send it to the new team member:
           <div class="invite-url">${url.origin}/admin/accept-invite?token=${newInviteToken}</div>`,
          true
        )
      : errParam === "noemail"
      ? flash("Please enter an email address.", false)
      : "";

    const memberRows = members
      .map(
        (m, i) => `
        <tr>
          <td>${esc(m.email)}</td>
          <td><span class="badge ${m.role === "admin" ? "badge-admin" : "badge-member"}">${m.role}</span></td>
          <td>${statusBadge(statuses[i])}</td>
          <td>${new Date(m.joined_at).toLocaleDateString()}</td>
          <td>
            ${
              isTeamAdmin && m.user_id !== userId
                ? `<form method="POST" style="display:inline">
                     <input type="hidden" name="_action" value="remove">
                     <input type="hidden" name="member_id" value="${esc(m.user_id)}">
                     <button type="submit" class="btn btn-danger"
                       onclick="return confirm('Remove ${esc(m.email)} from this team?')">Remove</button>
                   </form>`
                : `<span class="badge badge-admin" style="opacity:.5">you</span>`
            }
          </td>
        </tr>`
      )
      .join("");

    const inviteRows = invites
      .map(
        (inv) => `
        <tr>
          <td>${esc(inv.email)}</td>
          <td>Expires ${new Date(inv.expires_at).toLocaleDateString()}</td>
          <td>
            <a class="btn btn-ghost" style="font-size:.75rem"
               href="/admin/accept-invite?token=${inv.token}">Copy link</a>
          </td>
        </tr>`
      )
      .join("");

    const inviteForm = isTeamAdmin
      ? `<form method="POST">
           <input type="hidden" name="_action" value="invite">
           <div class="form-row">
             <div class="form-group">
               <label for="inv-email">Email address</label>
               <input type="email" id="inv-email" name="email" placeholder="developer@example.com" required>
             </div>
             <button type="submit" class="btn btn-primary" style="margin-bottom:0">Send invite</button>
           </div>
         </form>`
      : "";

    const body = `
      <div class="top-bar">
        <div class="top-bar-title">
          <h1>${esc(team.name)}</h1>
          <p class="page-sub">${members.length} member${members.length !== 1 ? "s" : ""}</p>
        </div>
        <a class="btn btn-ghost" href="/admin">&larr; All teams</a>
      </div>
      ${inviteFlash}
      <div class="card">
        <div class="card-header"><h2>Members</h2></div>
        <table>
          <thead>
            <tr>
              <th>Email</th><th>Role</th><th>Container</th><th>Joined</th><th></th>
            </tr>
          </thead>
          <tbody>${memberRows || `<tr><td colspan="5" class="empty">No members yet.</td></tr>`}</tbody>
        </table>
      </div>
      ${
        isTeamAdmin
          ? `<div class="card">
               <div class="card-header"><h2>Invite member</h2></div>
               <div class="card-body">
                 <p style="font-size:.85rem;color:var(--muted);margin-bottom:.75rem">
                   An invite link will be generated — share it with your developer via email or Slack.
                   Links expire after 7 days.
                 </p>
                 ${inviteForm}
               </div>
             </div>
             <div class="card">
               <div class="card-header"><h2>Pending invites</h2></div>
               ${
                 invites.length
                   ? `<table>
                        <thead><tr><th>Email</th><th>Expiry</th><th></th></tr></thead>
                        <tbody>${inviteRows}</tbody>
                      </table>`
                   : `<div class="card-body"><p class="empty">No pending invites.</p></div>`
               }
             </div>`
          : ""
      }
      <div class="card">
        <div class="card-header"><h2>WakaTime time tracking</h2></div>
        <div class="card-body" style="font-size:.875rem;color:var(--muted);line-height:1.6">
          WakaTime is pre-installed in every container. Each developer configures their own
          API key via <code>Settings → Extensions → WakaTime</code> or the
          <code>~/.wakatime.cfg</code> file in their terminal.
          View team stats at
          <a href="https://wakatime.com/dashboard" target="_blank" rel="noopener"
             style="color:var(--accent)">wakatime.com/dashboard</a>
          once members have connected their accounts.
        </div>
      </div>`;

    return new Response(shell(team.name, body, userEmail), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // ── GET /admin/accept-invite ───────────────────────────────────────────────
  if (path === "/admin/accept-invite" && request.method === "GET") {
    const token = url.searchParams.get("token");
    if (!token) return new Response("Missing token", { status: 400 });

    const invite = await getInvite(env.TEAMS_DB, token);
    if (!invite || invite.expires_at < Date.now()) {
      return new Response(
        shell(
          "Invalid invite",
          `<div class="flash flash-err">This invite link is invalid or has expired.</div>
           <a class="btn btn-ghost" href="/admin">&larr; Dashboard</a>`,
          userEmail
        ),
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    await Promise.all([
      addMember(env.TEAMS_DB, invite.team_id, userId, userEmail),
      deleteInvite(env.TEAMS_DB, token),
    ]);

    return redirect(`/admin/team/${invite.team_id}`);
  }

  return null;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
