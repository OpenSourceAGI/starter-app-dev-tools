import { BookIcon, type LucideIcon, WebhookIcon } from 'lucide-react'
import type { LinkProps } from 'next/link'
import Link from 'next/link'
import type { ReactElement, ReactNode } from 'react'
import { cn } from '@/lib/cn'

const REPO_BASE = 'https://github.com/OpenSourceAGI/appdemo-dev-tools/tree/master'

type CatalogItem = {
  name: string
  path: string
  description: string
  command?: string
}

const apps: CatalogItem[] = [
  {
    name: 'docs',
    path: 'apps/docs',
    description:
      'Documentation site built with Next.js featuring AI chat, full-text search, and auto-generated API reference from TypeScript types and OpenAPI specs.',
    command: 'bun dev · npm run dev',
  },
  {
    name: 'Cloud-Computer-Control-Panel',
    path: 'apps/Cloud-Computer-Control-Panel',
    description:
      'Open-source cloud infrastructure management platform. Automates Dokploy deployment for container orchestration on AWS EC2.',
    command: 'bun dev · npm run dev',
  },
  {
    name: 'vscode-cloud',
    path: 'apps/vscode-cloud',
    description:
      'Per-user VS Code (code-server) instances on Cloudflare Containers, with SSO via Cloudflare Access and per-user credentials in a Durable Object.',
    command: 'bun deploy · wrangler deploy',
  },
]

const starterTemplates: CatalogItem[] = [
  {
    name: 'template-svelte-betterauth-drizzle-shadcn',
    path: 'starter-templates/template-svelte-betterauth-drizzle-shadcn',
    description:
      'Full-stack SvelteKit app with Better Auth, Drizzle ORM on Cloudflare D1, Stripe payments, and shadcn-svelte components.',
    command: 'bun create starter-app · npx create-starter-app',
  },
  {
    name: 'template-nextjs-betterauth-shadcn-drizzle',
    path: 'starter-templates/template-nextjs-betterauth-shadcn-drizzle',
    description:
      'Next.js SaaS boilerplate with PostgreSQL, Better Auth, Stripe subscriptions, and shadcn/ui components.',
    command: 'bun create starter-app · npx create-starter-app',
  },
  {
    name: 'template-nextjs-betterauth-shadcn-prisma',
    path: 'starter-templates/template-nextjs-betterauth-shadcn-prisma',
    description:
      'Lightweight Next.js starter with Prisma ORM, Better Auth, Google OAuth, credential login, and protected routes.',
    command: 'bun create starter-app · npx create-starter-app',
  },
  {
    name: 'template-fumadocs',
    path: 'starter-templates/template-fumadocs',
    description:
      'Documentation site with Fumadocs, Orama search, OpenAPI/Swagger docs, MDX support, and collapsible sidebar.',
    command: 'bun create starter-app · npx create-starter-app',
  },
  {
    name: 'template-docusaurus',
    path: 'starter-templates/template-docusaurus',
    description:
      'Docusaurus 3 docs template with offline Lunr search, OpenAPI plugin, and classic theme optimized for technical docs.',
    command: 'bun create starter-app · npx create-starter-app',
  },
]

const utilityPackages: CatalogItem[] = [
  {
    name: 'about-system-info',
    path: 'packages/about-system-info',
    description:
      'Cross-platform CLI that prints CPU, memory, disk, uptime, public IP, ISP, and installed tools as a compact emoji line. Add it to your shell config for an instant snapshot on every terminal launch.',
    command: 'npx about-system · npm install -g about-system',
  },
  {
    name: 'api2ai-mcp-generator',
    path: 'packages/api2ai-mcp-generator',
    description:
      'Generate production-ready MCP servers from any OpenAPI spec using the mcp-use framework. Supports HTTP/SSE/Streamable HTTP transports, includes an inspector UI, Zod validation, and Docker/PM2/Kubernetes configs.',
    command: 'npx api2ai <openapi-spec-url> · npm install -g api2ai',
  },
  {
    name: 'cloudflare-to-claude-fix',
    path: 'packages/cloudflare-to-claude-fix',
    description:
      'Cloudflare Workers Queue consumer that fires a Claude Code routine automatically whenever a Workers build fails.',
    command: 'bun deploy · wrangler deploy',
  },
  {
    name: 'create-cloud-db',
    path: 'packages/create-cloud-db',
    description:
      'Interactive CLI that creates a Turso edge database and writes TURSO_DATABASE_URL and TURSO_AUTH_TOKEN directly into your .env file.',
    command: 'npx create-cloud-db [db-name] · npm install -g create-cloud-db',
  },
  {
    name: 'create-starter-app',
    path: 'packages/create-starter-app',
    description:
      'Interactive CLI to scaffold a starter app from curated templates. Prompts for framework, auth provider, database, and UI library.',
    command: 'npx create-starter-app · bun create starter-app',
  },
  {
    name: 'export-svg-icons-typescript',
    path: 'packages/export-svg-icons-typescript',
    description:
      'Convert a folder of SVG icons into a color-customizable, tree-shakable TypeScript index.ts that works with any component framework.',
    command: 'npx export-svg-typescript -i ./src/icons',
  },
  {
    name: 'git0-repo-downloader',
    path: 'packages/git0-repo-downloader',
    description:
      'CLI to search GitHub repositories by keyword, download source archives or platform-matched release binaries, install dependencies, and open the project in your editor.',
    command: 'npx git0 <repo> · npm install -g git0',
  },
  {
    name: 'manage-storage',
    path: 'packages/manage-storage',
    description:
      'Unified storage API for AWS S3, Cloudflare R2, and Backblaze B2 built on AWS SDK v3. Auto-detects the configured provider — ideal for serverless and edge environments.',
    command: 'npm install manage-storage · bun add manage-storage',
  },
  {
    name: 'open-when-ready',
    path: 'packages/open-when-ready',
    description:
      'Smart dev server wrapper for Next.js, Vite, or any CLI tool. Auto-opens the browser when ready and launches your AI assistant on errors with a pre-filled prompt.',
    command: 'npx open-ready <command> · npm install -g open-ready',
  },
  {
    name: 'react-native-app-buttons',
    path: 'packages/react-native-app-buttons',
    description:
      'React badge components for 8 app store and platform download links. Detects the user OS, highlights the matching button, and generates native deep links.',
    command: 'npm install react-native-app-buttons',
  },
  {
    name: 'server-shell-setup',
    path: 'packages/server-shell-setup',
    description:
      'One-command bootstrap for a modern dev environment: fish, nvim, nushell, bun, node, helix, starship, docker, and more. Supports Arch, Ubuntu/Debian, Termux, macOS, Fedora, and Alpine.',
    command: 'wget -qO- tinyurl.com/shellsetup | bash',
  },
  {
    name: 'shadcn-theme-menu',
    path: 'packages/shadcn-theme-menu',
    description:
      'Drop-in theme switcher for shadcn/ui with 24+ color themes, dark/light/system mode toggle, and smooth animations.',
    command: 'npm install shadcn-themes · bun add shadcn-themes',
  },
  {
    name: 'verify-phone-sms',
    path: 'packages/verify-phone-sms',
    description:
      'SMS phone verification API server built with Hono on Cloudflare Workers, backed by AWS SNS. Blocks VoIP, enforces API keys, rate-limits, and exposes OpenAPI docs.',
    command: 'bun deploy · wrangler deploy',
  },
  {
    name: 'web2mobile-wrapper',
    path: 'packages/web2mobile-wrapper',
    description:
      'Transform any website URL into a native mobile app wrapper for iOS and Android. Generates a React Native project pre-configured with your URL, push notifications, and store metadata.',
    command: 'npx create-mobile-wrapper · npm install -g create-mobile-wrapper',
  },
]

export default function DocsPage(): ReactElement {
  return (
    <main className='container flex max-w-[1300px] flex-col py-16'>
      <h1 className='font-semibold text-2xl md:text-3xl'>
        Welcome to the Starter Kit
      </h1>

      <div className='mt-8 grid grid-cols-1 gap-4 text-left md:grid-cols-2'>
        <DocumentationItem
          title='📚 Documentation'
          description='Get started with the Fumadocs framework.'
          icon={{ icon: BookIcon, id: '(index)' }}
          href='/docs'
          colorClass='bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50'
          iconColorClass='bg-blue-500/20 border-blue-500/40 text-blue-600 dark:text-blue-400'
        />

        <DocumentationItem
          title='🔧 Tool Rank'
          description="Get started with Fumadocs's API reference feature."
          icon={{ icon: WebhookIcon, id: 'api-reference' }}
          href='/docs/comparisons/_tool_rank'
          colorClass='bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50'
          iconColorClass='bg-purple-500/20 border-purple-500/40 text-purple-600 dark:text-purple-400'
        />
      </div>

      <CatalogSection title='Apps' items={apps} />
      <CatalogSection title='Starter Templates' items={starterTemplates} />
      <CatalogSection title='Utility Packages' items={utilityPackages} />
    </main>
  )
}

function CatalogSection({
  title,
  items,
}: {
  title: string
  items: CatalogItem[]
}): ReactElement {
  return (
    <section className='mt-12'>
      <h2 className='mb-4 font-semibold text-xl md:text-2xl'>{title}</h2>
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {items.map((item) => (
          <CatalogCard key={item.path} item={item} />
        ))}
      </div>
    </section>
  )
}

function CatalogCard({ item }: { item: CatalogItem }): ReactElement {
  return (
    <Link
      href={`${REPO_BASE}/${item.path}`}
      target='_blank'
      rel='noreferrer'
      className='flex flex-col rounded-2xl border border-border bg-fd-accent/30 p-5 shadow-lg backdrop-blur-lg transition-all hover:bg-fd-accent'
    >
      <h3 className='mb-2 font-semibold text-base'>{item.name}</h3>
      <p className='flex-1 text-fd-muted-foreground text-sm'>
        {item.description}
      </p>
      {item.command && (
        <code className='mt-3 block rounded bg-fd-muted/50 px-2 py-1 text-fd-muted-foreground text-xs'>
          {item.command}
        </code>
      )}
    </Link>
  )
}

function DocumentationItem({
  title,
  description,
  icon: { icon: ItemIcon, id },
  href,
  colorClass,
  iconColorClass,
}: {
  title: string
  description: string
  icon: {
    icon: LucideIcon
    id: string
  }
  href: string
  colorClass?: string
  iconColorClass?: string
}): ReactElement {
  return (
    <Item href={href} colorClass={colorClass}>
      <Icon className={id} iconColorClass={iconColorClass}>
        <ItemIcon className='size-full' />
      </Icon>
      <h2 className='mb-2 font-semibold text-lg'>{title}</h2>
      <p className='text-fd-muted-foreground text-sm'>{description}</p>
    </Item>
  )
}

function Icon({
  className,
  children,
  iconColorClass,
}: {
  className?: string
  children: ReactNode
  iconColorClass?: string
}): ReactElement {
  return (
    <div
      className={cn(
        'mb-2 size-9 rounded-lg border p-1.5 shadow-fd-primary/30',
        iconColorClass || className
      )}
      style={{
        boxShadow: 'inset 0px 8px 8px 0px var(--tw-shadow-color)',
      }}
    >
      {children}
    </div>
  )
}

function Item(
  props: LinkProps & { className?: string; children: ReactNode; colorClass?: string }
): ReactElement {
  const { className, children, colorClass, ...rest } = props
  return (
    <Link
      {...rest}
      className={cn(
        'rounded-2xl border border-border bg-fd-accent/30 p-6 shadow-lg backdrop-blur-lg transition-all hover:bg-fd-accent',
        colorClass,
        className
      )}
    >
      {children}
    </Link>
  )
}
