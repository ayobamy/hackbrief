import { revalidateTag } from "next/cache";
import { connection } from "next/server";

import { EVENTS_TAG } from "@/app/events/data";
import { getDatabase } from "@/lib/db";
import { isAuthorized } from "@/lib/import/auth";
import { runImport } from "@/lib/import/run";
import { fetchSource, SOURCES } from "@/lib/sources";

/** Run daily by Vercel Cron (vercel.json); refused without the CRON_SECRET it sends. */
export async function GET(request: Request) {
  await connection();
  if (!isAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await runImport(getDatabase(), SOURCES, (url) => fetchSource(url));
  if (summary.status !== "failed") {
    // The next visit to /events is served the old list while the new one is fetched.
    revalidateTag(EVENTS_TAG, "max");
  }
  return Response.json(summary, {
    status: summary.status === "failed" ? 502 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
