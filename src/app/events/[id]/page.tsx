import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getEvent, getShownBrief } from "@/app/events/data";
import { EventBrief } from "@/components/brief/event-brief";
import { LABEL, SHEET } from "@/components/sheet";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { skippedMessage } from "@/lib/briefs/messages";
import { briefFromFacts, hasFindings } from "@/lib/coach/brief";
import { eventContext, parseEventId, type EventContext } from "@/lib/events/context";

const LINK = "font-medium underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

type Props = { params: Promise<{ id: string }> };

async function eventFor(params: Props["params"]): Promise<EventContext | null> {
  const id = parseEventId({ event: (await params).id });
  const event = id ? await getEvent(id) : null;
  return event ? eventContext(event) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await eventFor(params);
  return event
    ? { title: event.name, description: `The brief for ${event.name}: the deadline, who can enter, what to hand in and how it is judged.` }
    : { title: "Hackathon not found" };
}

function EventHeader({ event }: { event: EventContext }) {
  return (
    <header className="flex flex-col gap-2">
      <p className={LABEL}>The brief</p>
      <h1 className="text-4xl leading-tight font-semibold tracking-[-0.04em]">{event.name}</h1>
      {event.details ? <p className="text-muted">{event.details}</p> : null}
      {event.organiser ? <p className="text-sm text-muted">By {event.organiser}</p> : null}
      {event.listedBy.length > 0 ? <p className="text-xs text-muted">Listed by {event.listedBy.join(", ")}.</p> : null}
    </header>
  );
}

/** No brief to show: why, and the two ways on, the organiser's page and the coach. */
function NoBrief({ event, reason }: { event: EventContext; reason: string | null }) {
  return (
    <section className={`${SHEET} flex flex-col gap-3 p-5 sm:p-6`}>
      <p>{reason ?? "hackbrief has not read this event's rules yet."}</p>
      <p className="text-sm">
        {event.rulesUrl ? (
          <>
            <a href={event.rulesUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
              Open its rules on {event.host}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            , then{" "}
          </>
        ) : null}
        <Link href={`/coach?event=${event.id}`} className={LINK}>
          paste them into the coach
        </Link>{" "}
        to build the brief yourself.
      </p>
    </section>
  );
}

async function BriefFor({ event }: { event: EventContext }) {
  const shown = await getShownBrief(event.id);
  const host = event.host ?? "its site";
  if (shown?.status === "built") {
    const today = new Date().toISOString().slice(0, 10);
    if (hasFindings(briefFromFacts(shown.facts, today))) {
      return <EventBrief eventId={event.id} eventName={event.name} facts={shown.facts} pages={shown.pages} serverToday={today} />;
    }
    return <NoBrief event={event} reason={`hackbrief read its page on ${host} but found no rules there.`} />;
  }
  return <NoBrief event={event} reason={shown?.status === "skipped" ? skippedMessage(shown.reason, host) : null} />;
}

// The event's address needs the request, so the page around it renders at once and this waits for it.
async function EventFor({ params }: Props) {
  const event = await eventFor(params);
  if (!event) {
    notFound();
  }
  return (
    <>
      <EventHeader event={event} />
      <Suspense
        fallback={
          <p role="status" className="text-sm text-muted motion-safe:animate-pulse">
            Building your brief from {event.host ?? "its site"}… The first brief for an event takes a few seconds; after
            that it opens at once.
          </p>
        }
      >
        <BriefFor event={event} />
      </Suspense>
    </>
  );
}

/** A listed hackathon's own page, which opens on its brief (#62). */
export default function EventPage({ params }: Props) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
        <Suspense fallback={<p className="text-sm text-muted">Opening the brief…</p>}>
          <EventFor params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
