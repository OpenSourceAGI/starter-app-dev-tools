<script context="module" lang="ts"> //allows its vars to be exported as a module
   import { iconFiles, iconRead, iconConfigure, iconQwksearch } from "$lib/components/icons";
  import HomePage from "$lib/components/AppLayout/HomePage.svelte";
  // Navigation items configuration
  export const listDockApps = [
    {
      id: "home",
      icon: iconQwksearch,
      component: HomePage,
      title: "Svelte Starter DOCS - Home",
    },
  
  
    {
      id: "settings",
      icon: iconConfigure,
      title: "Settings",
      // disabled: true,
    },
  ]

</script>

