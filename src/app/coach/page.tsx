import type { Metadata } from "next";
import { after } from "next/server";
import { Suspense } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { getBuiltBrief, getEvent, getStoredBrief, refreshBrief, saveBuiltBrief } from "@/app/events/data";
import { onOpen, type ShownBrief } from "@/lib/briefs/build";
import { eventContext, parseEventId, type EventContext } from "@/lib/events/context";

import { Coach } from "./coach";

export const metadata: Metadata = {
  title: "Coach",
  description:
    "Paste a hackathon's rules and judging criteria; get the key dates, a submission checklist and a strategy weighted by the rubric.",
};

// A brief opened from the list (`/coach?event=<id>`) shows that event; any other id, or none, gives the
// plain coach. The lookup is cached like the list, and an unavailable database only loses the context.
async function lookUpEvent(id: string | null): Promise<EventContext | null> {
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
async function lookUpBrief(id: string | null): Promise<ShownBrief | null> {
  if (!id) {
    return null;
  }
  try {
    const now = new Date();
    const opened = onOpen(await getStoredBrief(id), now);
    if ("show" in opened) {
      if (opened.refresh) {
        after(() => refreshBrief(id));
      }
      return opened.show;
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

/**
 * The coach for the event in the address, keyed by it: opening another event's brief starts a fresh
 * coach at once, rather than showing the last event's brief until the new lookups land (#78). Reading
 * the address needs the request, so this sits in its own Suspense boundary and the page around it still
 * renders at once; the lookups themselves are not awaited, so nothing typed is lost when they land.
 */
async function CoachFor({ searchParams }: { searchParams: PageProps<"/coach">["searchParams"] }) {
  const id = parseEventId(await searchParams);
  return <Coach key={id ?? ""} event={lookUpEvent(id)} rules={lookUpBrief(id)} />;
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
        <Suspense fallback={null}>
          <CoachFor searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
