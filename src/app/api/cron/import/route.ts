import { revalidateTag } from "next/cache";
import { connection } from "next/server";

import { EVENTS_TAG } from "@/app/events/data";
import { briefDepsFrom } from "@/lib/briefs/deps";
import { runBriefs } from "@/lib/briefs/run";
import { getDatabase } from "@/lib/db";
import { isAuthorized } from "@/lib/auth";
import { runImport } from "@/lib/import/run";
import { guardedFetch } from "@/lib/rules/fetcher";
import { fetchSource, SOURCES } from "@/lib/sources";

// Vercel Hobby's limit for a function (docs/architecture.md). Briefs start only until BRIEFS_UNTIL_MS, so
// the slowest one (choosing pages, reading them and a model's reading, about 70 s) still ends in time.
export const maxDuration = 300;
const BRIEFS_UNTIL_MS = 220_000;

/**
 * Run daily by Vercel Cron (vercel.json); refused without the CRON_SECRET it sends. Imports the sources,
 * then builds the listed events' briefs ahead of visitors (decision D13, #60) in the time left.
 */
export async function GET(request: Request) {
  await connection();
  const started = Date.now();
  if (!isAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getDatabase();
  const summary = await runImport(db, SOURCES, (url, headers) => fetchSource(url, { headers }));
  const now = new Date();
  const deps = briefDepsFrom(process.env, { fetch: guardedFetch, today: now.toISOString().slice(0, 10), now });
  const briefs = await runBriefs(db, deps, { budgetMs: BRIEFS_UNTIL_MS - (Date.now() - started) });
  if (summary.status !== "failed" || briefs.built > 0) {
    // The next visit to /events or a brief is served the old version while the new one is fetched.
    revalidateTag(EVENTS_TAG, "max");
  }
  return Response.json({ ...summary, briefs }, {
    status: summary.status === "failed" ? 502 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
