import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDatabase } from "@/lib/db";
import { checkDatabase } from "@/lib/health";

export async function GET() {
  // Wait for a real request: this route must never be prerendered at build time.
  await connection();

  const database = await checkDatabase(() => getDatabase().execute(sql`select 1`));
  const healthy = database.status === "ok";

  return Response.json(
    { status: healthy ? "ok" : "degraded", database },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
