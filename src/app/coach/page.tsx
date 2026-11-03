import type { Metadata } from "next";
import { after } from "next/server";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { getBuiltBrief, getEvent, getStoredBrief, refreshBrief, saveBuiltBrief } from "@/app/events/data";
import { isStale, type ShownBrief } from "@/lib/briefs/build";
import { eventContext, parseEventId, type EventContext } from "@/lib/events/context";

import { Coach } from "./coach";

export const metadata: Metadata = {
  title: "Coach",
  description:
    "Paste a hackathon's rules and judging criteria; get the key dates, a submission checklist and a strategy weighted by the rubric.",
};

// A brief opened from the list (`/coach?event=<id>`) shows that event; any other id, or none, gives the
// plain coach. The lookup is cached like the list, and an unavailable database only loses the context.
async function lookUpEvent(searchParams: PageProps<"/coach">["searchParams"]): Promise<EventContext | null> {
  const id = parseEventId(await searchParams);
  if (!id) {
    return null;
  }
  try {
    const found = await getEvent(id);
    return found ? eventContext(found) : null;
  } catch (error) {
    console.error("Could not look up the event for the coach", error);
    return null;
  }
}

/**
 * The event's brief (#60): the stored one at once, rebuilt after the response when it is a day old; or,
 * when none is stored yet, built now from its pages (decisions D11, D13) and saved after the response,
 * so every later visitor gets it at once. Null without an event.
 */
async function lookUpBrief(searchParams: PageProps<"/coach">["searchParams"]): Promise<ShownBrief | null> {
  const id = parseEventId(await searchParams);
  if (!id) {
    return null;
  }
  try {
    const stored = await getStoredBrief(id);
    const now = new Date();
    if (stored?.facts) {
      if (isStale(stored.checkedAt, now)) {
        after(() => refreshBrief(id));
      }
      return { status: "built", facts: stored.facts, pages: stored.pages };
    }
    const built = await getBuiltBrief(id, now.toISOString().slice(0, 10));
    if (built.status === "built") {
      after(() => saveBuiltBrief(id, built));
      return { status: "built", facts: built.facts, pages: built.pages };
    }
    return built.status === "skipped" ? built : null;
  } catch (error) {
    console.error("Could not read the event's page for the coach", error);
    return { status: "skipped", reason: "unreachable" };
  }
}

export default function CoachPage({ searchParams }: PageProps<"/coach">) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Coach</p>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">Paste the rules, get a plan</h1>
          <p className="text-muted">
            Paste a hackathon&apos;s rules and judging criteria. hackbrief pulls out the dates, who can
            enter and what to submit, and turns the judging weights into where to spend your time.
          </p>
        </header>
        {/* Not awaited: the coach renders at once, and only the parts that name the event wait for
            it, so nothing typed before the lookup lands is lost to a remount. */}
        <Coach event={lookUpEvent(searchParams)} rules={lookUpBrief(searchParams)} />
      </main>
      <SiteFooter />
    </>
  );
}
