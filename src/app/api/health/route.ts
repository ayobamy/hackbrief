import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { isAuthorized } from "@/lib/auth";
import { getDatabase } from "@/lib/db";
import { checkDatabase } from "@/lib/health";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  // Wait for a real request: this route must never be prerendered at build time.
  await connection();

  // Anyone may ask whether the app is up, but only a monitor that sends CRON_SECRET makes it query
  // the database: public calls would otherwise keep Neon's compute awake (D8).
  if (!isAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ status: "ok", database: "not checked" }, { headers: NO_STORE });
  }

  const database = await checkDatabase(() => getDatabase().execute(sql`select 1`));
  const healthy = database.status === "ok";

  return Response.json(
    { status: healthy ? "ok" : "degraded", database },
    { status: healthy ? 200 : 503, headers: NO_STORE },
  );
}
