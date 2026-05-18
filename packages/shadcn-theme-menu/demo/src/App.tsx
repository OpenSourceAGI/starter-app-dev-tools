import { useState, useEffect, useRef } from 'react'
import { ThemeProvider } from 'shadcn-themes/theme-provider'
import { ThemeToggle } from 'shadcn-themes/theme-toggle'
import { ThemeDropdown, themeNames, themeColors, formatThemeName } from 'shadcn-themes/theme-dropdown'
import CinematicThemeSwitcher from 'shadcn-themes/cinematic-theme-switcher'
import {
  Palette,
  Moon,
  Sparkles,
  Code,
  Layers,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { SectionCards } from '@/components/section-cards'
import { ChartAreaInteractive } from '@/components/chart-area-interactive'
import { DataTable } from '@/components/data-table'
import data from '@/app/dashboard/data.json'

function App() {
  const [currentTheme, setCurrentTheme] = useState('minimal')
  const [mounted, setMounted] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('color-theme') || 'minimal'
    if (themeNames.includes(saved)) {
      setCurrentTheme(saved)
    }
    themeNames.forEach((t: string) => document.documentElement.classList.remove(`theme-${t}`))
    document.documentElement.classList.add(`theme-${saved}`)
  }, [])

  const handleThemeChange = (themeName: string) => {
    setCurrentTheme(themeName)
    localStorage.setItem('color-theme', themeName)
    themeNames.forEach((t: string) => document.documentElement.classList.remove(`theme-${t}`))
    document.documentElement.classList.add(`theme-${themeName}`)
  }

  const scroll = (dir: 'left' | 'right') => {
    carouselRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  if (!mounted) return null

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">

          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <Palette className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Shadcn Themes</h1>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <ThemeDropdown />
                <CinematicThemeSwitcher />
              </div>
            </div>
          </header>

          {/* Hero */}
          <section className="container mx-auto px-4 py-16 text-center">
            <div className="mx-auto max-w-3xl space-y-6">
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                Beautiful Themes for{' '}
                <span className="text-primary">shadcn/ui</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                60+ pre-built color themes with dark/light mode support, stunning animations,
                and seamless integration with shadcn/ui components.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <code className="rounded bg-muted px-3 py-1.5 text-sm font-mono">
                  npm install @qwksearch/shadcn-themes
                </code>
              </div>
            </div>
          </section>

          {/* Theme Carousel */}
          <section className="py-12">
            <div className="container mx-auto px-4 mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold">Available Themes</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => scroll('left')}
                  className="rounded-full border border-border bg-card p-2 hover:bg-accent transition-colors"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => scroll('right')}
                  className="rounded-full border border-border bg-card p-2 hover:bg-accent transition-colors"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div
              ref={carouselRef}
              className="flex gap-3 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ paddingLeft: 'max(1rem, calc((100vw - 1280px) / 2 + 1rem))' }}
            >
              {themeNames.map((themeName) => {
                const colors = themeColors[themeName]
                return (
                  <ThemeCard
                    key={themeName}
                    themeName={themeName}
                    colors={colors}
                    isActive={currentTheme === themeName}
                    onClick={() => handleThemeChange(themeName)}
                  />
                )
              })}
              {/* spacer so last card isn't flush against the edge */}
              <div className="shrink-0 w-4" />
            </div>
          </section>

          {/* Dashboard */}
          <section className="py-12">
            <div className="container mx-auto px-4 mb-8">
              <h3 className="text-2xl font-bold">Dashboard Preview</h3>
              <p className="text-muted-foreground mt-1">See how themes look on a real dashboard layout</p>
            </div>
            <SidebarProvider className="!min-h-0">
              <AppSidebar />
              <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col gap-4 py-4 @container/main">
                  <SectionCards />
                  <div className="px-4 lg:px-6">
                    <ChartAreaInteractive />
                  </div>
                  <DataTable data={data} />
                </div>
              </SidebarInset>
            </SidebarProvider>
          </section>

          {/* Features */}
          <section className="container mx-auto px-4 py-16">
            <h3 className="text-2xl font-bold text-center mb-12">Features</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <FeatureCard icon={<Palette className="h-8 w-8" />} title="60+ Color Themes" description="From minimal to cyberpunk, elegant to bold. Choose the perfect theme for your project." />
              <FeatureCard icon={<Moon className="h-8 w-8" />} title="Dark/Light Mode" description="Seamless theme switching with system preference support and smooth transitions." />
              <FeatureCard icon={<Sparkles className="h-8 w-8" />} title="Animated Switcher" description="Cinematic theme switcher with particle effects and neumorphic design." />
              <FeatureCard icon={<Code className="h-8 w-8" />} title="Type-Safe" description="Built with TypeScript for full type safety and excellent developer experience." />
              <FeatureCard icon={<Layers className="h-8 w-8" />} title="Next.js Ready" description="Works perfectly with Next.js App Router and next-themes out of the box." />
              <FeatureCard icon={<Zap className="h-8 w-8" />} title="Easy to Use" description="Single import endpoint, no configuration needed. Just import and use." />
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-border bg-muted/50 mt-16">
            <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
              <p>Built with shadcn/ui, React, and TypeScript</p>
              <p className="mt-2">
                Current theme: <span className="font-semibold text-foreground">{formatThemeName(currentTheme)}</span>
              </p>
            </div>
          </footer>

        </div>
      </TooltipProvider>
    </ThemeProvider>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md">
      <div className="text-primary mb-4">{icon}</div>
      <h4 className="text-lg font-semibold mb-2 text-card-foreground">{title}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function ThemeCard({ themeName, colors, isActive, onClick }: {
  themeName: string
  colors: { primary: string; secondary: string }
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative shrink-0 w-36 rounded-lg border border-border bg-card p-4 text-left shadow-sm
        transition-all hover:shadow-md hover:scale-105
        ${isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded-full border border-border shadow-sm" style={{ backgroundColor: colors.primary }} />
          <div className="h-5 w-5 rounded-full border border-border shadow-sm" style={{ backgroundColor: colors.secondary }} />
        </div>
        {isActive && <div className="h-2 w-2 rounded-full bg-primary" />}
      </div>
      <h4 className="text-xs font-semibold text-card-foreground group-hover:text-primary transition-colors leading-tight">
        {formatThemeName(themeName)}
      </h4>
    </button>
  )
}

export default App
