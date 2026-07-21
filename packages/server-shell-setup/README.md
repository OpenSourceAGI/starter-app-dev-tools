<p align="center">
    <img src="https://i.imgur.com/a7ozEX5.jpeg">
</p>
<p align="center"> 
    <a href="https://github.com/vtempest/server-shell-setup/discussions">
    <img alt="GitHub Discussions"
        src="https://img.shields.io/github/discussions/vtempest/server-shell-setup">
    </a>
     <a href="https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
            alt="PRs Welcome" />
    </a>
    <a href="https://codespaces.new/vtempest/server-shell-setup">
    <img src="https://github.com/codespaces/badge.svg" width="150" height="20">
    </a>
</p>

## The Devil Is In The Defaults

> If you hold a unix shell up to your ear, can you hear the C?

One-command setup for a modern dev environment: `fish`, `nvim`, `nushell`, `bun`, `node`, `helix`, `starship`, `docker`, and more. Includes fish aliases for `service_manager`, `killport`, `search`, and others.

**Supported systems**: Arch, Ubuntu/Debian, Android (Termux), macOS, Fedora, Alpine

## Install

On a fresh server, you may first need to set passwords:
```bash
sudo passwd        # set root password
sudo passwd $USER  # set user password
```

**Interactive menu** — pick what to install:
```bash
wget -qO- tinyurl.com/shellsetup | bash
```

**Install everything unattended:**
```bash
wget -qO- tinyurl.com/shellsetup | bash -s -- all
```

**Install specific components only:**
```bash
wget -qO- tinyurl.com/shellsetup | bash -s -- starship,docker,node
```

## Components

| Name | Description |
|------|-------------|
| `fish` | Modern shell with auto-suggestions, syntax highlighting, and plugins (oh-my-fish, fzf, z, pisces) |
| `nushell` | Data-oriented shell that handles structured data natively |
| `nvim` | Neovim with [NvChad](https://nvchad.com) config pre-installed |
| `helix` | Modal terminal editor written in Rust, no config needed |
| `node` | Node.js via [Volta](https://volta.sh) version manager (no sudo issues); also installs pnpm, yarn, git0, vite, turbo |
| `bun` | Fast JavaScript runtime, bundler, and package manager |
| `docker` | Docker with rootless mode enabled |
| `starship` | Cross-shell prompt configured for bash, fish, and nushell |
| `systeminfo` | Prints system stats (user, host, disk, RAM, CPU, uptime, IP, location, open ports) on login |
| `pacstall` | AUR-like package manager for Ubuntu/Debian |
| `code` | [code-server](https://github.com/coder/code-server) — VSCode in the browser |
| `sudo` | Enable passwordless sudo for current user |

## Fish Aliases

| Alias | Expands to |
|-------|-----------|
| `in <pkg>` | `sudo apt install <pkg>` |
| `e <file>` | `nvim <file>` |
| `del <path>` | `sudo rm -rf <path>` |
| `setup` | Re-run this install script |
| `killport` | Interactive fzf menu to kill a process by port |
| `search <query>` | Search file names and file contents (via ripgrep) |
| `service_manager` | Interactive fzf menu to start/stop/restart/view systemd services |

## Example: System Info on Login

```
👤 deck 🏠 steamdeck 📁 90% 💾 2/14GB 🔝 6% cursor ⏱️  1d 7h 18m 🌎 174.194.193.230
📍 San Jose 🔗 http://230.sub-174-194-193.myvzw.com 👮 Verizon Business ⚡ SteamOS
📈 AMD Custom APU 0405 💻 Jupiter 🔧 6.11.11-valve12-1-neptune 🐚 fish 🚀 npm pip docker nvim bun
🔌 57343stea 46583stea 27060stea 📦 docker-node
```

## Reference Docs

- [Cursor AI Editor](https://docs.cursor.com/welcome)
- [Cursor MCP Servers](https://cursor.directory)
- [VSCode Docs](https://code.visualstudio.com/docs)
- [VSCode Extensions](https://marketplace.visualstudio.com/search?target=VSCode&category=All%20categories&sortBy=Installs)
- [Fish Features Overview](https://medium.com/the-glitcher/fish-shell-3ec1a6cc6128)
- [Fish Playground](https://rootnroll.com/d/fish-shell/)
- [git0 Installer](https://git0.js.org/)
- [Bun.js Runtime Docs](https://bun.sh/docs)
- [Node.js Best Packages](https://github.com/sindresorhus/awesome-nodejs)
- [Volta Node Installer](https://docs.volta.sh/guide/)
- [pnpm Package Installer](https://pnpm.io/pnpm-cli)
- [Starship Prompt](https://starship.rs/guide/)
- [Helix Editor](https://docs.helix-editor.com)
- [Neovim](https://github.com/neovim/neovim)
- [Neovim LazyVim Config](https://www.lazyvim.org/keymaps)
- [gh GitHub CLI](https://cli.github.com/manual/gh)
- [DevDocs.io](https://devdocs.io/)
- [Terminal Best Tools](https://github.com/k4m4/terminals-are-sexy)
