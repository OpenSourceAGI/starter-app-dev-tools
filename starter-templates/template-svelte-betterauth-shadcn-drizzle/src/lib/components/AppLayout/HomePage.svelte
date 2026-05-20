<script lang="ts">
    import * as LucideIcons from "lucide-svelte";

    // Features data
    const features = [
      {
        title: "Drizzle ORM",
        description: "Next gen, lightweight ORM compatible with Cloudflare D1",
        icon: "Database",
        badge: "Database",
        color: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
      },
      {
        title: "Better Auth",
        description: "A fully typed auth library with Google oAuth sign-in, Stripe integration, and comprehensive API documentation",
        icon: "Shield",
        badge: "Authentication",
        color: "bg-green-500/10 text-green-600 dark:text-green-400"
      },
      {
        title: "Cloudflare",
        description: "Serverless autoscaling API and D1 database, great hosting platform with free tier",
        icon: "Cloud",
        badge: "Hosting",
        color: "bg-orange-500/10 text-orange-600 dark:text-orange-400"
      },
      {
        title: "SvelteKit",
        description: "Full stack interface and API routes framework",
        icon: "Zap",
        badge: "Framework",
        color: "bg-red-500/10 text-red-600 dark:text-red-400"
      }
    ];

    // Get icon component dynamically
    function getIcon(iconName: string) {
      return LucideIcons[iconName as keyof typeof LucideIcons] || LucideIcons.HelpCircle;
    }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
  <!-- Header -->
  <header class="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 dark:border-slate-800">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex h-16 items-center justify-between">
        <!-- Logo -->
        <div class="flex items-center space-x-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <LucideIcons.FileText class="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-900 dark:text-white">Svelte Starter DOCS</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">Documentation Template</p>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="hidden md:flex items-center space-x-6">
          <a href="#features" class="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
            Features
          </a>
          <a href="#docs" class="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
            Documentation
          </a>
          <a href="#github" class="text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
            GitHub
          </a>
        </nav>

        <!-- Actions -->
        <div class="flex items-center space-x-3">
          <!-- Theme Toggle -->
          <button class="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors">
            <LucideIcons.Sun class="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>

          <!-- Login/Register -->
          <button class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors">
            <LucideIcons.LogIn class="h-4 w-4 mr-2 inline" />
            Login
          </button>
          <button class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <LucideIcons.UserPlus class="h-4 w-4 mr-2 inline" />
            Register
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative overflow-hidden py-20 sm:py-32">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <!-- Logo and Title -->
        <div class="mb-8 flex justify-center">
          <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 shadow-2xl">
            <LucideIcons.FileText class="h-12 w-12 text-white" />
          </div>
        </div>

        <h1 class="mb-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
          Welcome to{" "}
          <span class="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Svelte Starter DOCS
          </span>
          !
        </h1>

        <p class="mx-auto mb-8 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          Svelte Starter DOCS is a SvelteKit template that comes with a lot of features and tools to help you build your next project.
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button class="px-6 py-3 text-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all">
            <LucideIcons.Rocket class="h-5 w-5 mr-2 inline" />
            Get Started
          </button>
          <button class="px-6 py-3 text-lg font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 transition-colors">
            <LucideIcons.Github class="h-5 w-5 mr-2 inline" />
            View on GitHub
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section id="features" class="py-20 sm:py-32">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <h2 class="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Powerful Features Out of the Box
        </h2>
        <p class="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Everything you need to build modern web applications
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {#each features as feature}
          <div class="group p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300">
            <div class="flex items-center justify-between mb-4">
              <div class="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 group-hover:scale-110 transition-transform">
              </div>
              <span class="px-2 py-1 text-xs font-medium rounded-full {feature.color}">
                {feature.badge}
              </span>
            </div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
            <p class="text-slate-600 dark:text-slate-300 text-sm">
              {feature.description}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <!-- Additional Info Section -->
  <section class="py-20 bg-slate-50 dark:bg-slate-800/50">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Ready to Get Started?
          </h3>
          <p class="text-slate-600 dark:text-slate-300 mb-6">
            This template provides a solid foundation for building modern web applications with SvelteKit, 
            complete with authentication, database integration, and deployment-ready configuration.
          </p>
          <div class="space-y-3">
            <div class="flex items-center space-x-3">
              <LucideIcons.CheckCircle class="h-5 w-5 text-green-500" />
              <span class="text-slate-700 dark:text-slate-300">Type-safe database operations</span>
            </div>
            <div class="flex items-center space-x-3">
              <LucideIcons.CheckCircle class="h-5 w-5 text-green-500" />
              <span class="text-slate-700 dark:text-slate-300">Secure authentication system</span>
            </div>
            <div class="flex items-center space-x-3">
              <LucideIcons.CheckCircle class="h-5 w-5 text-green-500" />
              <span class="text-slate-700 dark:text-slate-300">Serverless deployment ready</span>
            </div>
            <div class="flex items-center space-x-3">
              <LucideIcons.CheckCircle class="h-5 w-5 text-green-500" />
              <span class="text-slate-700 dark:text-slate-300">Modern UI components</span>
            </div>
          </div>
        </div>
        <div class="relative">
          <div class="aspect-video rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
            <LucideIcons.Code class="h-16 w-16 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t bg-white dark:bg-slate-900 dark:border-slate-800">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div class="col-span-1 md:col-span-2">
          <div class="flex items-center space-x-3 mb-4">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <LucideIcons.FileText class="h-5 w-5 text-white" />
            </div>
            <span class="text-lg font-bold text-slate-900 dark:text-white">Svelte Starter DOCS</span>
          </div>
          <p class="text-slate-600 dark:text-slate-300 mb-4">
            A comprehensive SvelteKit template with modern tooling and best practices.
          </p>
          <div class="flex space-x-4">
            <a href="#" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <LucideIcons.Github class="h-5 w-5" />
            </a>
            <a href="#" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <LucideIcons.Twitter class="h-5 w-5" />
            </a>
            <a href="#" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <LucideIcons.MessageCircle class="h-5 w-5" />
            </a>
          </div>
        </div>
        
        <div>
          <h4 class="font-semibold text-slate-900 dark:text-white mb-4">Documentation</h4>
          <ul class="space-y-2">
            <li><a href="#" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Getting Started</a></li>
            <li><a href="#" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">API Reference</a></li>
            <li><a href="#" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Components</a></li>
            <li><a href="#" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Examples</a></li>
          </ul>
        </div>
        
        <div>
          <h4 class="font-semibold text-slate-900 dark:text-white mb-4">Resources</h4>
          <ul class="space-y-2">
            <li><a href="#" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">GitHub</a></li>
            <li><a href="#" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Issues</a></li>
            <li><a href="#" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Discussions</a></li>
            <li><a href="#" class="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">Changelog</a></li>
          </ul>
        </div>
      </div>
      
      <div class="border-t border-slate-200 dark:border-slate-700 my-8"></div>
      
      <div class="flex flex-col sm:flex-row justify-between items-center">
        <p class="text-sm text-slate-500 dark:text-slate-400">
          © 2024 Svelte Starter DOCS. All rights reserved.
        </p>
        <div class="flex space-x-6 mt-4 sm:mt-0">
          <a href="#" class="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">Privacy</a>
          <a href="#" class="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">Terms</a>
          <a href="#" class="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors">Cookies</a>
        </div>
      </div>
    </div>
  </footer>
</div>