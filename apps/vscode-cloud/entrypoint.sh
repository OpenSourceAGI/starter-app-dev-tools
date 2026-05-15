#!/bin/bash
set -e

WORKSPACE="/home/coder/workspace"

# ── R2 FUSE mount ─────────────────────────────────────────────────────────────
# All four R2 vars must be present for the mount to proceed.
# USER_ID is the sanitised email slug used as the per-user bucket prefix.
if [[ -n "$R2_ACCESS_KEY_ID" && -n "$R2_SECRET_ACCESS_KEY" && \
      -n "$R2_ACCOUNT_ID"    && -n "$R2_BUCKET_NAME" ]]; then

  # geesefs reads credentials from the AWS shared-credentials format
  mkdir -p "$HOME/.aws"
  cat > "$HOME/.aws/credentials" <<CREDS
[default]
aws_access_key_id=${R2_ACCESS_KEY_ID}
aws_secret_access_key=${R2_SECRET_ACCESS_KEY}
CREDS

  # Per-user prefix: users/<userId>/ — keeps every workspace isolated in the bucket
  PREFIX="users/${USER_ID:-default}"

  echo "[entrypoint] Mounting R2 bucket '${R2_BUCKET_NAME}' at ${WORKSPACE} (prefix: ${PREFIX})"

  geesefs \
    --endpoint "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
    --subdomain \
    --cache /tmp/geesefs-cache \
    --attr-cache-ttl 60s \
    --type-cache-ttl 60s \
    --dir-mode 0755 \
    --file-mode 0644 \
    --uid "$(id -u)" \
    --gid "$(id -g)" \
    -o allow_other \
    "${R2_BUCKET_NAME}:${PREFIX}" \
    "${WORKSPACE}"

  echo "[entrypoint] R2 mount ready — live sync active"
else
  echo "[entrypoint] R2 credentials not set — using local ephemeral workspace"
fi

# ── Clone GitHub repos ────────────────────────────────────────────────────────
# GITHUB_REPOS: comma-separated "owner/repo" pairs, e.g. "myorg/api,myorg/frontend"
# GITHUB_TOKEN: optional PAT for private repos
if [[ -n "$GITHUB_REPOS" ]]; then
  echo "[entrypoint] Cloning GitHub repos: $GITHUB_REPOS"

  # Configure git credential helper once so token isn't logged per-command
  if [[ -n "$GITHUB_TOKEN" ]]; then
    git config --global credential.helper store
    echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > "$HOME/.git-credentials"
  fi

  IFS=',' read -ra REPOS <<< "$GITHUB_REPOS"
  for repo in "${REPOS[@]}"; do
    repo="${repo// /}"  # strip any spaces
    [[ -z "$repo" ]] && continue

    dir_name=$(basename "$repo" .git)
    target="${WORKSPACE}/${dir_name}"

    if [[ -d "$target/.git" ]]; then
      echo "[entrypoint] Pulling latest for ${repo}"
      git -C "$target" pull --ff-only 2>/dev/null || echo "[entrypoint] Warning: pull failed for ${repo}, using cached copy"
    else
      echo "[entrypoint] Cloning ${repo}"
      git clone --depth=50 "https://github.com/${repo}.git" "$target" \
        || echo "[entrypoint] Warning: clone failed for ${repo}"
    fi
  done
fi

# ── VSCode workspace settings for FUSE performance ───────────────────────────
# Written only once; users can override later without it being clobbered.
VSCODE_DIR="${WORKSPACE}/.vscode"
SETTINGS_FILE="${VSCODE_DIR}/settings.json"
if [[ ! -f "$SETTINGS_FILE" ]]; then
  mkdir -p "$VSCODE_DIR"
  cat > "$SETTINGS_FILE" <<'SETTINGS'
{
  "files.watcherExclude": {
    "**/.git/objects/**": true,
    "**/.git/subtree-cache/**": true,
    "**/node_modules/**": true,
    "**/__pycache__/**": true
  },
  "files.exclude": {
    "**/.git": true
  },
  "search.followSymlinks": false,
  "search.exclude": {
    "**/node_modules": true,
    "**/.git": true,
    "**/__pycache__": true
  },
  "editor.formatOnSave": true,
  "terminal.integrated.defaultProfile.linux": "bash"
}
SETTINGS
  echo "[entrypoint] VSCode workspace settings written"
fi

# ── Start code-server ─────────────────────────────────────────────────────────
# PASSWORD is injected by the Durable Object via envVars before container start.
exec /usr/bin/entrypoint.sh --bind-addr 0.0.0.0:8080 --auth password "${WORKSPACE}"
