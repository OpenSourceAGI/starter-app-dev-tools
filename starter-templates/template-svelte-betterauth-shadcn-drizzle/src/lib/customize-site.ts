/**
 * Domain Specific Customizations
 */
export const DEV = typeof window !== "undefined" && window.location.hostname.includes('localhost'),
  DEV_PORT = 5173,
  PUBLIC_DOMAIN = DEV ? `http://localhost:${DEV_PORT}` : "https://starterdocs.com",
  PUBLIC_GOOGLE_CLIENT_ID = "your-google-client-id-here",
  APP_NAME = "Starter Docs",
  APP_SLOGAN = "Svelte Starter Full Stack App with Docs and API",
  APP_EMAIL = "support@" + PUBLIC_DOMAIN.split("//")[1],
  APP_ICON = PUBLIC_DOMAIN + "/icons/app-icon.svg",
  GOOGLE_ANALYTICS = "your-google-analytics-id",
  SERVER_API_URL = "/api/",
  LAST_REVISED_DATE = "January 1, 2025",
  listFooterLinks = [
    { url: "/docs/", text: "Documentation", icon: "BookOpen" },
    { url: "/blog", text: "Blog", icon: "Newspaper" },
    { url: "/support", text: "Support", icon: "MessageCircle" },
    { url: "/privacy", text: "Privacy", icon: "Lock" },
    { url: "/terms", text: "Terms", icon: "FileText" },
    { url: "/about", text: "About", icon: "Info" },
  ];