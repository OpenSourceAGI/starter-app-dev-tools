import type {
  AgentPromptType,
  SearchResultType,
} from "ai-research-agent";
import type * as schema from "$lib/server/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";

declare global {
  type SearchResult = SearchResultType;
  type AgentPrompt = AgentPromptType;
  type Database = DrizzleD1Database<typeof schema>;

  type Article = typeof schema.articles.$inferSelect;
  type Message = typeof schema.messages.$inferSelect;
  type Chat = typeof schema.chats.$inferSelect;
  type File = typeof schema.files.$inferSelect;
  type Team = typeof schema.teams.$inferSelect;
  type User = typeof schema.user.$inferSelect & {
    settings: UserSettings;
  };
  type Session = typeof schema.session.$inferSelect;
  type Account = typeof schema.account.$inferSelect;
  type VerificationToken = typeof schema.verification.$inferSelect;

  interface Env {
    DB: D1Database;
    PUBLIC_DOMAIN: string;
    PUBLIC_GOOGLE_CLIENT_ID: string;
    GROQ_API_KEY: string;
    STRIPE_API_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    XAI_API_KEY: string;
    AUTH_SECRET: string;
    BETTER_AUTH_SECRET: string;
    AUTH_RESEND_KEY: string;
    AUTH_GOOGLE_ID: string;
    AUTH_GOOGLE_SECRET: string;
    AUTH_MICROSOFT_ENTRA_ID_ID: string;
    AUTH_MICROSOFT_ENTRA_ID_SECRET: string;
    AUTH_MICROSOFT_ENTRA_ID_ISSUER: string;
    AUTH_FACEBOOK_ID: string;
    AUTH_FACEBOOK_SECRET: string;
    AUTH_DISCORD_ID: string;
    AUTH_DISCORD_SECRET: string;
    AUTH_LINKEDIN_ID: string;
    AUTH_LINKEDIN_SECRET: string;
    AUTH_GITHUB_ID: string;
    AUTH_GITHUB_SECRET: string;
  }

  type UserSettings = Partial<{
    provider: string;
    model: string;
    temperature: number;
    topP: number;
    frequencyPenalty: number;
    providerApiKeys: Array<{
      provider: string;
      key: string;
    }>;
    theme: string;
    language: string;
    fontSize: number;
    fontFamily: string;
    searchEngines: Array<{
      name: string;
      status: string;
    }>;
    searchEngineDefault: string;
    OpenFirstResultInBackgroundTab: boolean;
    OpenFirstResultInSameTab: boolean;
    AutoSummarize: boolean;
    showURLPath: boolean;
    showHeadings: boolean;
    enableQueryExpansion: boolean;
    numberTopResultToExtract: number;
  }>;
  
  namespace App {
    interface Locals {
      db: Database;
      user: User | null;
    }
    interface Platform {
      env: Env;
      cf: CfProperties;
      ctx: ExecutionContext;
    }
  }
  
  interface Response {
    isLoading?: boolean;
    error?: string;
  }

  interface Window {
    appDockClickOnHover: ReturnType<typeof setTimeout> | null;
    find(
      SearchString: string,
      CaseSensitive: boolean,
      Backwards: boolean,
      WrapAround: boolean,
      WholeWord: boolean,
      SearchInFrames: boolean,
      ShowDialog: boolean
    ): boolean;
  }
}

export {};
