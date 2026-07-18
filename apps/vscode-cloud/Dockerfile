# ── Base image ────────────────────────────────────────────────────────────────
FROM codercom/code-server:ubuntu

LABEL org.opencontainers.image.title="vscode-cloud" \
      org.opencontainers.image.description="code-server with multi-language runtimes, AI CLIs, language servers, and R2-backed workspace persistence" \
      org.opencontainers.image.source="https://github.com/OpenSourceAGI/appdemo-dev-tools"

# ── System packages ───────────────────────────────────────────────────────────
USER root

ENV DEBIAN_FRONTEND=noninteractive

# Single apt layer: system utilities + all language runtimes
RUN apt-get update && apt-get install -y --no-install-recommends \
    # system utilities
    curl \
    wget \
    git \
    vim \
    jq \
    zip \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    shellcheck \
    # build toolchain
    build-essential \
    pkg-config \
    # FUSE (R2/geesefs workspace mount)
    fuse3 \
    libfuse2 \
    # Python
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    # Go
    golang \
    # Rust (bootstrapped via rustup below for a current stable toolchain)
    # Java + build tools
    default-jdk \
    maven \
    gradle \
    # PHP
    php-cli \
    composer \
    # Ruby
    ruby-full \
    luarocks \
    # Fonts (settings.json references JetBrains Mono)
    fonts-jetbrains-mono \
    fonts-firacode \
  && rm -rf /var/lib/apt/lists/*

# Rust via rustup so we get a current stable toolchain, not the distro's ancient one
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --no-modify-path --default-toolchain stable --profile minimal \
  && rustup component add rust-analyzer \
  && chmod -R a+rx /usr/local/rustup /usr/local/cargo

# geesefs — S3/R2-compatible FUSE filesystem for workspace persistence
RUN curl -fsSL https://github.com/yandex-cloud/geesefs/releases/latest/download/geesefs-linux-amd64 \
    -o /usr/local/bin/geesefs \
  && chmod +x /usr/local/bin/geesefs

# Allow non-root users to mount FUSE filesystems (needed by geesefs)
RUN echo "user_allow_other" >> /etc/fuse.conf

# ── Node.js LTS ───────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# ── Global npm tools ──────────────────────────────────────────────────────────
# AI coding CLIs + TypeScript + language servers for VS Code IntelliSense
ENV NPM_CONFIG_PREFIX=/usr/local
RUN npm install -g \
    @anthropic-ai/claude-code \
    @openai/codex \
    typescript \
    typescript-language-server \
    pyright \
    bash-language-server \
    yaml-language-server \
    vscode-langservers-extracted \
    dockerfile-language-server-nodejs \
    prettier \
    eslint

# ── Sudo password for coder user ─────────────────────────────────────────────
ARG SUDO_PASSWORD=coder
RUN echo "coder:${SUDO_PASSWORD}" | chpasswd

# ── Workspace mount point ─────────────────────────────────────────────────────
RUN mkdir -p /home/coder/workspace && chown -R coder:coder /home/coder

# ── VS Code extensions ────────────────────────────────────────────────────────
# Installed from Open VSX Registry at build time; failures are non-fatal.
USER coder

RUN for ext in \
    # AI assistants
    saoudrizwan.claude-dev \
    # Formatting & linting
    esbenp.prettier-vscode \
    anthropic.claude-code \
    openai.chatgpt \
    dbaeumer.vscode-eslint \
    editorconfig.editorconfig \
    streetsidesoftware.code-spell-checker \
    # Python
    ms-python.python \
    ms-python.vscode-pylance \
    # JavaScript / TypeScript
    ms-vscode.vscode-typescript-next \
    # Go
    # Rust
    rust-lang.rust-analyzer \
    # Web
    bradlc.vscode-tailwindcss \
    vue.volar \
    svelte.svelte-vscode \
    # Data / config formats
    redhat.vscode-yaml \
    redhat.vscode-xml \
    tamasfe.even-better-toml \
    # UX / productivity
    pkief.material-icon-theme \
    usernamehw.errorlens \
    christian-kohler.path-intellisense \
    formulahendry.code-runner; \
    # Time tracking
    # WakaTime.vscode-wakatime; \
  do \
    code-server --install-extension "$ext" \
      || echo "[docker] Warning: failed to install $ext (non-fatal)"; \
  done

# ── Dev environment setup (setupdev) ─────────────────────────────────────────
# Runs as coder; sudo password piped via -S so internal apt/system calls work.
ARG SUDO_PASSWORD=coder
RUN echo "${SUDO_PASSWORD}" | sudo -S bash -c \
    "wget -qO- https://tinyurl.com/setupdev | bash -s -- all"

# ── Entrypoint ────────────────────────────────────────────────────────────────
WORKDIR /home/coder

COPY --chown=coder:coder entrypoint.sh /home/coder/entrypoint.sh
RUN chmod +x /home/coder/entrypoint.sh

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:8080/healthz || exit 1

ENTRYPOINT ["/home/coder/entrypoint.sh"]
