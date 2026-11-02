import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export type Database = ReturnType<typeof createDatabase>;

function createDatabase(url: string) {
  // A small pool: serverless functions each hold their own, and Neon's free plan caps connections.
  return drizzle({ client: postgres(url, { max: 5 }) });
}

// One client per server process. Kept on globalThis so that hot reloads in development reuse it
// instead of opening a new pool on every edit.
const globalForDatabase = globalThis as typeof globalThis & { hackrDatabase?: Database };

/**
 * The database client, created on first use so that builds and tests that never touch the
 * database need no DATABASE_URL.
 */
export function getDatabase(): Database {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set; copy .env.example to .env.local");
  }
  globalForDatabase.hackrDatabase ??= createDatabase(url);
  return globalForDatabase.hackrDatabase;
}
