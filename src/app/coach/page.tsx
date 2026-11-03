import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { getEvent, getEventRules, getFilled } from "@/app/events/data";
import { eventContext, parseEventId, type EventContext } from "@/lib/events/context";
import type { ReadResult } from "@/lib/rules/read";

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

// The event's own pages, read so the brief can be built at once (decision D11), with a model's reading
// of them (D13), each from its own cache; null without an event.
async function lookUpRules(searchParams: PageProps<"/coach">["searchParams"]): Promise<ReadResult | null> {
  const id = parseEventId(await searchParams);
  if (!id) {
    return null;
  }
  try {
    const rules = await getEventRules(id);
    if (rules.status !== "read") {
      return rules;
    }
    const filled = await getFilled(rules.text);
    return filled ? { ...rules, filled } : rules;
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
        <Coach event={lookUpEvent(searchParams)} rules={lookUpRules(searchParams)} />
      </main>
      <SiteFooter />
    </>
  );
}
