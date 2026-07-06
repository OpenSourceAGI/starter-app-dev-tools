# Changelog

# MVP Phase (2026)

## June 2026

Code visualization and package polish. Introduced the **code-graph** and **code-tree-graph** packages with file analysis and interactive visualization components, built on **TypeScript** and **Vite**. Upgraded **Shiki** syntax highlighting to **4.0.0** across the docs. Refactored authentication and social components in the **Next.js themes/teams/Stripe** starter template and removed unused files. Simplified shell-change logic in **server-shell-setup**. Automated version bumps published updated releases across all workspace packages.

## May 2026

Biggest month of the year, centered on **vscode-cloud** — a browser-based VS Code IDE running on **Cloudflare Workers + Containers**. Shipped passwordless **Google OAuth** login, a **teams dashboard** with invites and role-based admin (D1-backed), **WakaTime** time tracking, live container status, and a multi-language Dockerfile (Go, Rust, Java, PHP, Ruby, plus language servers and AI coding CLIs). Provisioned **KV/D1** resources and enabled **Workers observability**. Beyond the IDE: added a **Cloudflare Queue consumer** that triggers Claude Code routines on failed builds, implemented **risk-based tool classification and runtime security policies** for the **OpenAPI→MCP generator**, scaffolded a **shadcn** demo with an expanded theme collection, added a **WebGL shader background** and Sparkles UI to the docs home page, migrated download buttons to **react-app-store-buttons**, and published the new **export-svg-icons-typescript** package.

## April 2026

New packages and app scaffolding. Built the **verify-phone-sms** package (51 files) with its own documentation site. Added the initial **vscode-cloud** app files to the repo. Major restructuring of the **api2ai-mcp-generator** (OpenAPI designer, components, Fumadocs content — a 545-file reorganization). Continued work on **web2mobile-generator** and the **Fumadocs** template.

## March 2026

Documentation platform reset. Initialized a fresh **Fumadocs** project with auto-generated **API documentation**, updated core configurations, and removed unused utilities. Merged in the **server-shell-setup** package for one-command dev machine provisioning. Marketing content updates.

## February 2026

Docs refresh: updated the starter guide content, added a new **UI block template**, and replaced the cloud compute architecture diagram.

## January 2026

**Cloud Computer Control Panel (CCCP)** buildout — a dashboard for launching and managing cloud servers. Implemented one-click software installation on EC2 instances, first via **AWS SSM** with live progress tracking, then switched to direct **SSH** with automatic **2048-bit RSA key generation** stored in localStorage. Added a **Dokploy** installation flow, region selection, real-time instance status and controls, and replaced custom XML parsing with **AWS SDK v3**. Fixed VPC handling for security groups and reorganized CCP components into subfolders. Rewrote **about-system** in TypeScript with a JS API library and split it into sections. Ten PRs merged (#8–#22).

# Docs & Templates Phase (2025)

## December 2025

Documentation platform overhaul and CCCP kickoff. Rebuilt the docs on a new **Fumadocs** base with pages covering **AI coding tools**, investment/data brokers, and **sov.ai**. Added the **about-system** and **create-cloud-db** packages. Started the **CCCP** app and enhanced its homepage header with prominent documentation links, icons, and color-coded emoji cards (PRs #4–#7). Shipped releases 1.0.1–1.0.5.

## November 2025

Branding and docs maintenance: logo updates, new API docs fixes on **Fumadocs**, and AI marketing content.

## September 2025

System-information features: added system info reporting, **ISP detection**, and **VPN (PairVPN)** support to the about-system module. Introduced AI-assisted code editing. Fixed docs folder paths and uploaded the docs distribution.

## August 2025

Docs starter maturity. Custom **Fumadocs** starter page with working markdown pages and custom domains. Added **Next.js** and **Svelte** starter templates. Published releases 0.9.1–0.9.2.

## July 2025

**Major V2 release**: adopted **better-auth**, rebuilt documentation on **Docusaurus** (later **Fumadocs**), and published extensive research comparing top developer tools — AI, SMS, and payments providers — as ranked comparison docs.

## June 2025

New project logo and branding assets.

# Prototype Phase (2024)

## December 2024

**Major rewrite into 10 simple files.** Added **TypeDoc**-generated API documentation for file-tree functions, standard **PWA add-to-homescreen** static files, app.html fixes, custom docs domain (CNAME), and repository renaming/cleanup. First cohesive docs site.

## November 2024

README expanded with extra UI resources, favicons, and analytics guidance. Documented the email-forwarding setup step.

## October 2024

Community contributions and onboarding polish. Merged the first external PR (#1) improving README installation steps (clone/cd/install flow, database backup script). Added the image logo to the README.

## July 2024

Revived the repo as a serverless starter: live demo link, screenshots, **Wrangler** and **.env** samples, and README fixes.

# Origins (2015–2017)

Started in June 2015 as a **Node.js/Express** authentication starter with Facebook and Windows login scripts, server deployment tips, and extensive README documentation. Later additions included **Yeoman** scaffolding (2017) before the project went dormant until its 2024 serverless revival.
