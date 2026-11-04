import type { Metadata } from "next";
import { Suspense } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { getEvent, getShownBrief } from "@/app/events/data";
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
 * The coach for the event in the address, keyed by it: opening another event's brief starts a fresh
 * coach at once, rather than showing the last event's brief until the new lookups land (#78). Reading
 * the address needs the request, so this sits in its own Suspense boundary and the page around it still
 * renders at once; the lookups themselves are not awaited, so nothing typed is lost when they land.
 */
async function CoachFor({ searchParams }: { searchParams: PageProps<"/coach">["searchParams"] }) {
  const id = parseEventId(await searchParams);
  return <Coach key={id ?? ""} event={lookUpEvent(id)} rules={id ? getShownBrief(id) : Promise.resolve(null)} />;
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
