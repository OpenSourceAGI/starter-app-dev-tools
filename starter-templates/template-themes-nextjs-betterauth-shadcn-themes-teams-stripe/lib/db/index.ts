import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import * as schema from "./schema";
import * as relations from "./relations";

type DbInstance = ReturnType<typeof drizzleD1>;
let _db: DbInstance | null = null;

function getDb(): DbInstance {
  if (!_db) {
    const env = (globalThis as any).env;
    if (!env?.DB) {
      throw new Error("Cloudflare D1 database binding (DB) not found. Ensure wrangler.jsonc is properly configured.");
    }
    console.log("[getDB] Using Cloudflare D1 database");
    _db = drizzleD1(env.DB, { schema: { ...schema, ...relations } });
  }
  return _db;
}

export const db = new Proxy({} as DbInstance, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
