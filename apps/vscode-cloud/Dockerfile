FROM codercom/code-server:ubuntu

# ── System packages (run as root) ─────────────────────────────────────────────
USER root

RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    vim \
    build-essential \
    fuse3 \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# geesefs — S3/R2-compatible FUSE filesystem
RUN curl -L https://github.com/yandex-cloud/geesefs/releases/latest/download/geesefs-linux-amd64 \
    -o /usr/local/bin/geesefs && chmod +x /usr/local/bin/geesefs

# Allow non-root users to mount FUSE filesystems
RUN echo "user_allow_other" >> /etc/fuse.conf

# Node.js LTS (used by code-server and the CLI tools below)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# ── AI coding CLIs ────────────────────────────────────────────────────────────
# Installed globally so they are on PATH for every user and every terminal session.
RUN npm install -g \
    @anthropic-ai/claude-code \
    @openai/codex

# Workspace mount point
RUN mkdir -p /home/coder/workspace && chown -R coder:coder /home/coder

# ── VS Code extensions (pre-installed at build time) ─────────────────────────
# Installed from Open VSX Registry (code-server's default marketplace).
# Failures are non-fatal — the IDE still launches without them.
USER coder

RUN for ext in \
    eamodio.gitlens \
    esbenp.prettier-vscode \
    dbaeumer.vscode-eslint \
    ms-python.python \
    bradlc.vscode-tailwindcss \
    christian-kohler.path-intellisense \
    formulahendry.code-runner \
    pkief.material-icon-theme \
    usernamehw.errorlens \
    streetsidesoftware.code-spell-checker \
    WakaTime.vscode-wakatime; \
  do \
    code-server --install-extension "$ext" || echo "[docker] Warning: failed to install $ext"; \
  done

WORKDIR /home/coder

COPY --chown=coder:coder entrypoint.sh /home/coder/entrypoint.sh
RUN chmod +x /home/coder/entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/home/coder/entrypoint.sh"]
