<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import { ChevronDown, Plus, Settings, Home, Inbox, Calendar, Search, AudioWaveform, BookOpen, Bot, ChartPie, Command, Frame, GalleryVerticalEnd, Map, Settings2, SquareTerminal } from "lucide-svelte";
  
  import { onMount } from "svelte";
  // import {themeNames} from "./Theme.svelte";
  import "./themes-shadcn.css";
  // src/lib/stores/theme.ts
  import HomePage from "$lib/components/AppLayout/HomePage.svelte";
  import { writable } from "svelte/store";

  import { listDockApps } from "./AppDockViews.svelte";
  import AppDockMenu from "./AppDockMenu.svelte";
  
  // Import the fixed sidebar-07 components
  import AppSidebar from "./app-sidebar-fixed.svelte";
  
  import {
    setupMobileView,
    setStateInURL,
    loadHeadTags,
    type DeviceInfo,
  } from "$lib/components/utils";
  import { log, grab } from "grab-api.js";
  import {
    APP_NAME,
    GOOGLE_ANALYTICS,
    APP_SLOGAN,
    SERVER_API_URL,
  } from "$lib/customize-site";

  import { authClient } from "$lib/components/utils/auth-client";

  export const theme = writable("modern-minimal"); // default theme

  // Type definitions
  interface User {
    name?: string;
    email?: string;
    avatar?: string;
    [key: string]: any;
  }

  interface ViewComponent {
    id: string;
    icon: any;
    component?: any;
    title: string;
    disabled?: boolean;
  }

  // State variables
  let view = $state("home");
  let user: User = $state({});
  let deviceInfo: DeviceInfo = $state({});

  $effect(() => {
    if (view) setStateInURL({ view });
  });

  let currentTheme = $state("");

  $effect(() => {
    const unsubscribe = theme.subscribe((value) => {
      currentTheme = value;
      // Persist user choice
      localStorage.setItem("theme", value);
    });
    return () => unsubscribe();
  });

  onMount(async () => {
    if (typeof window === "undefined") return;

    grab("", {
      setDefaults: true,
      baseURL: SERVER_API_URL,
      timeout: 30,
      debug: true,
      cache: false,
      cancelNewIfOngoing: true,
    });

    // get the view from the URL or default to the first app
    view = setStateInURL().view || "home";
    // listen to mobile view changes
    setupMobileView(deviceInfo);

    // get user from server
    await loadUser();

    if (!user?.name) {
      await authClient.oneTap({
        fetchOptions: {
          onSuccess: loadUser,
        },
      });
    }
  });

  const loadUser = async () => await grab("user", { response: user });

  // Initialize sidebar context
  const sidebar = useSidebar();
  
  function handleAppDockClick(newView) {
    if (view === newView) return;

    view = newView;
  }
</script>

<Sidebar.Provider style="--sidebar-width:16rem; --sidebar-width-mobile:18rem;">
  <div class="flex h-screen w-full overflow-hidden">
    <!-- Use the fixed sidebar-07 AppSidebar component -->
    <AppSidebar />

    <!-- Mobile Trigger and Dock -->
    <div class={deviceInfo?.isMobile ? "fixed bottom-0 left-0 w-full z-10" : "absolute top-0 left-0 z-100 mt-16"}>
      <!-- <AppDockMenu {handleAppDockClick} {listDockApps} /> -->
      {#if deviceInfo?.isMobile}
        <Sidebar.Trigger class="md:hidden absolute top-4 left-4 z-50">
          <button class="p-2 rounded-lg bg-gray-200 dark:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6"  x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </Sidebar.Trigger>
      {/if}
    </div>

    <!-- Main Content Area -->
    <Sidebar.Inset>
      <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <div class="flex items-center gap-2">
          <Sidebar.Trigger class="-ml-1" />
        </div>
      </header>
      <main class="flex-1 overflow-y-auto p-4 {deviceInfo?.isMobile ? 'mb-16' : ''}">
        {#each listDockApps as viewComponent (viewComponent.id)}
          {#if viewComponent.component && viewComponent.id === view}
            <svelte:component this={viewComponent.component} />
          {/if}
        {/each}
      </main>
    </Sidebar.Inset>
  </div>
</Sidebar.Provider>
