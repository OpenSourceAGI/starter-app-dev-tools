/**
 * @file features-grid.tsx
 * @description Grid component displaying the key features and benefits of GRAB.
 */
import Image from "next/image"
import {
  Zap,
  Database,
  RefreshCw,
  Bug,
  Shield,
  Clock,
  Layers,
  Infinity,
  Globe,
  HardDrive,
  RotateCcw,
  Boxes,
  Terminal,
  FileCode,
  Gauge,
  Repeat,
  Upload,
  Network,
  Play,
  FlaskConical,
} from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "Auto-JSON Convert",
    description: "Pass parameters and get response or error in JSON, handling other data types automatically.",
  },
  {
    icon: RefreshCw,
    title: "Reactive Loading",
    description: "Sets .isLoading=true on response object for React, Vue, Svelte — any framework works.",
  },
  {
    icon: Bug,
    title: "Debug Logging",
    description: "Global log() prints colored JSON structure, response timing. Ctrl+I opens DevTools overlay.",
  },
  {
    icon: Database,
    title: "Mock Server",
    description: "Configure grab.mock for dev/testing. Supports conditional responses and delays.",
  },
  {
    icon: Shield,
    title: "Cancel Duplicates",
    description: "cancelOngoingIfNew or cancelNewIfOngoing prevents request cascading.",
  },
  {
    icon: Clock,
    title: "Timeout & Retry",
    description: "Configurable timeout (default 30s) with retryAttempts for auto-retry on failure.",
  },
  {
    icon: Terminal,
    title: "CLI Testing",
    description: "npm i -g grab-url for command line API testing with params and JSON payloads.",
  },
  {
    icon: Layers,
    title: "Request History",
    description: "All requests stored in grab.log for debugging and analytics.",
  },
  {
    icon: Infinity,
    title: "Infinite Scroll",
    description: "Built-in pagination that auto-loads and merges next page on scroll.",
  },
  {
    icon: Globe,
    title: "Instance Config",
    description: "Create separate instances with grab.instance() for different APIs.",
  },
  {
    icon: HardDrive,
    title: "Frontend Cache",
    description: "Set cache: true for instant repeat requests from browser memory.",
  },
  {
    icon: RotateCcw,
    title: "Regrab On Error",
    description: "Auto-retry on timeout, window refocus, network change, or stale data.",
  },
  {
    icon: Boxes,
    title: "Framework Agnostic",
    description: "Works anywhere — React, Vue, Svelte, vanilla JS. No lifecycle hooks needed.",
  },
  {
    icon: FileCode,
    title: "TypeScript Tooltips",
    description: "Full type inference with hover tooltips and autocomplete for options.",
  },
  {
    icon: Gauge,
    title: "Rate Limiting",
    description: "Built-in rate limiting prevents multi-click cascading responses.",
  },
  {
    icon: Network,
    title: "Request Hooks",
    description: "Global onRequest interceptor for auth headers and request modification.",
  },
  {
    icon: Upload,
    title: "File Upload",
    description: "FormData support with base64 conversion option for JSON APIs.",
  },
  {
    icon: FlaskConical,
    title: "Jest Testing",
    description: "Easy unit testing with mock setup and grab.log assertions.",
  },
  {
    icon: Play,
    title: "Proxy Support",
    description: "Node.js proxy support with HttpsProxyAgent for server-side requests.",
  },
  {
    icon: Repeat,
    title: "Repeat & Poll",
    description: "Repeat request X times or poll every X seconds for live updates.",
  },
]

export function FeaturesGrid() {
  return (
    <section className="relative py-20 md:py-32 border-b border-border overflow-hidden">
      <div className="absolute inset-0 animated-grid-bg opacity-30" />

      <div className="container mx-auto px-4 relative">
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-16">
          <div className="relative" style={{ animation: "float 6s ease-in-out infinite" }}>
            <Image
              src="https://i.imgur.com/RH80JGZ.png"
              alt="GRAB - Generate Request to API from Browser"
              width={200}
              height={200}
              className="drop-shadow-2xl"
            />
          </div>
          <div className="text-center md:text-left max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              GRAB is the FBEST Request Manager: Functionally Brilliant, Elegantly Simple Tool
            </h2>
            <p className="text-muted-foreground text-lg">
              20+ features packed into 4KB. No bloat, no dependencies, just pure functionality.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="animated-border-card group p-5 hover:bg-card/80 transition-all duration-300"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="relative z-10">
                <feature.icon className="h-7 w-7 text-primary mb-3 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="font-semibold mb-1.5 text-foreground text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
