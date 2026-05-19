// ─── Types ────────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  created_by: string;
  created_at: number;
}

export interface TeamMember {
  team_id: string;
  user_id: string;
  email: string;
  role: "admin" | "member";
  joined_at: number;
}

export interface TeamInvite {
  token: string;
  team_id: string;
  email: string;
  invited_by: string;
  created_at: number;
  expires_at: number;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

export async function initTeamsSchema(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS teams (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      created_by  TEXT NOT NULL,
      created_at  INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_members (
      team_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      email      TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'member',
      joined_at  INTEGER NOT NULL,
      PRIMARY KEY (team_id, user_id)
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS team_invites (
      token       TEXT PRIMARY KEY,
      team_id     TEXT NOT NULL,
      email       TEXT NOT NULL,
      invited_by  TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      expires_at  INTEGER NOT NULL
    )`),
  ]);
}

// ─── Teams ────────────────────────────────────────────────────────────────────

export async function createTeam(
  db: D1Database,
  name: string,
  creatorId: string,
  creatorEmail: string
): Promise<Team> {
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.batch([
    db.prepare(`INSERT INTO teams (id, name, created_by, created_at) VALUES (?, ?, ?, ?)`)
      .bind(id, name, creatorId, now),
    db.prepare(
      `INSERT INTO team_members (team_id, user_id, email, role, joined_at) VALUES (?, ?, ?, 'admin', ?)`
    ).bind(id, creatorId, creatorEmail, now),
  ]);
  return { id, name, created_by: creatorId, created_at: now };
}

export async function getAllTeams(db: D1Database): Promise<Team[]> {
  const r = await db.prepare(`SELECT * FROM teams ORDER BY created_at DESC`).all<Team>();
  return r.results;
}

export async function getTeamsByUser(db: D1Database, userId: string): Promise<Team[]> {
  const r = await db
    .prepare(
      `SELECT t.* FROM teams t
       JOIN team_members m ON t.id = m.team_id
       WHERE m.user_id = ?
       ORDER BY t.created_at DESC`
    )
    .bind(userId)
    .all<Team>();
  return r.results;
}

export async function getTeam(db: D1Database, id: string): Promise<Team | null> {
  return db.prepare(`SELECT * FROM teams WHERE id = ?`).bind(id).first<Team>();
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function getTeamMembers(db: D1Database, teamId: string): Promise<TeamMember[]> {
  const r = await db
    .prepare(`SELECT * FROM team_members WHERE team_id = ? ORDER BY joined_at ASC`)
    .bind(teamId)
    .all<TeamMember>();
  return r.results;
}

export async function getMemberRole(
  db: D1Database,
  teamId: string,
  userId: string
): Promise<"admin" | "member" | null> {
  const row = await db
    .prepare(`SELECT role FROM team_members WHERE team_id = ? AND user_id = ?`)
    .bind(teamId, userId)
    .first<{ role: string }>();
  return (row?.role as "admin" | "member") ?? null;
}

export async function addMember(
  db: D1Database,
  teamId: string,
  userId: string,
  email: string,
  role: "admin" | "member" = "member"
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO team_members (team_id, user_id, email, role, joined_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(team_id, user_id) DO NOTHING`
    )
    .bind(teamId, userId, email, role, Date.now())
    .run();
}

export async function removeMember(
  db: D1Database,
  teamId: string,
  userId: string
): Promise<void> {
  await db
    .prepare(`DELETE FROM team_members WHERE team_id = ? AND user_id = ?`)
    .bind(teamId, userId)
    .run();
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export async function createInvite(
  db: D1Database,
  teamId: string,
  email: string,
  invitedBy: string
): Promise<string> {
  const token = crypto.randomUUID();
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO team_invites (token, team_id, email, invited_by, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(token, teamId, email, invitedBy, now, now + 7 * 24 * 60 * 60 * 1000)
    .run();
  return token;
}

export async function getInvite(db: D1Database, token: string): Promise<TeamInvite | null> {
  return db.prepare(`SELECT * FROM team_invites WHERE token = ?`).bind(token).first<TeamInvite>();
}

export async function getPendingInvites(db: D1Database, teamId: string): Promise<TeamInvite[]> {
  const r = await db
    .prepare(
      `SELECT * FROM team_invites WHERE team_id = ? AND expires_at > ? ORDER BY created_at DESC`
    )
    .bind(teamId, Date.now())
    .all<TeamInvite>();
  return r.results;
}

export async function deleteInvite(db: D1Database, token: string): Promise<void> {
  await db.prepare(`DELETE FROM team_invites WHERE token = ?`).bind(token).run();
}
