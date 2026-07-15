# 🚀 Cloudflare Vinext Shadcn Fumadocs BetterAuth

A modern, feature-rich starter template for building your next big project!


[v0 Template](https://v0.app/templates/dashboard-landing-auth-billing-teams-docs-t-ExDfusFzX6P)

## ✨ Features

🎨 **Stunning UI** - Built with Tailwind CSS & Shadcn UI for a premium look.
🌓 **50 Color Themes** - Seamless light and dark mode switching with `next-themes`.
🔐 **Secure Authentication** - Powered by `better-auth` with Social & SIWE support.
💳 **Stripe Integration** - Subscription handling and payments ready to go.
📊 **Interactive Dashboard** - Beautiful charts and metrics visualization.
📱 **Fully Responsive** - Looks great on mobile, tablet, and desktop.
📝 **Documentation Engine** - Integrated docs with `fumadocs`.
🤖 **AI Ready** - Configure LLM providers easily in settings.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- npm, yarn, or bun package manager

### Installation

1. **Install dependencies**
```bash
npm install
# or with Bun
bun install
```

2. **Set up Cloudflare D1 database**
```bash
npx wrangler d1 create qwksearch
```
Copy the database ID and update it in `wrangler.jsonc`:
```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "qwksearch",
      "database_id": "YOUR_DATABASE_ID_HERE"
    }
  ]
}
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your configuration:
- Google OAuth credentials
- Better Auth secret (`openssl rand -base64 32`)
- Stripe API keys
- Email domain (for Cloudflare Email Service)

### Development

**Local development with Cloudflare D1:**
```bash
npx wrangler dev
```

This runs the app with D1 database bindings available locally.

Or for standard Next.js development:
```bash
npm run dev
```

This starts the Next.js dev server on http://localhost:3000 (requires local fallback setup).

Other commands:
```bash
# Build for production
npm run build

# Generate database migrations
npm run db:generate
npm run db:push

# Check documentation
npm run docs:check
```

## 🌐 Deployment

### Cloudflare Workers

This template is optimized for Cloudflare Workers deployment using `open-next` and `vinext`.

1. **Configure Email Service** (optional)
   - Set up your domain for Cloudflare Email Service: [developers.cloudflare.com/email-service/get-started/send-emails](https://developers.cloudflare.com/email-service/get-started/send-emails/)
   - Cloudflare will add SPF, DKIM, DMARC records and a bounce-routing endpoint
   - Update `EMAIL_FROM` in `.env.local` with your verified domain
   - The `send_email` binding in `wrangler.jsonc` is already configured

2. **Build and deploy**
```bash
npm run build
npx wrangler deploy
```

3. **Set environment secrets**
```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put EMAIL_FROM
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

3. **Update custom domain** (optional)
   - Go to Cloudflare dashboard
   - Add your custom domain to the Workers project

**Features:**
- Edge-first runtime
- Cloudflare D1 SQL database
- Cloudflare Images optimization
- KV-backed ISR cache
- Automatic image optimization
