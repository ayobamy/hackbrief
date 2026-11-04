"use client";

import { Suspense, use, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

import type { ShownBrief } from "@/lib/briefs/build";
import { briefFromFacts, buildBrief, hasFindings, localToday, type Brief, type BriefFacts } from "@/lib/coach/brief";
import { formatDaysLeft } from "@/lib/coach/format";
import type { ListingDates } from "@/lib/coach/listing";
import { SAMPLES } from "@/lib/coach/samples";
import { Checklist, Dates, FOCUS_RING, Judging, Plan, Section, SimpleList, Summary } from "@/components/brief/sections";
import { Footnote, LABEL, SHEET } from "@/components/sheet";
import { skippedMessage } from "@/lib/briefs/messages";
import { pageLink, type EventContext } from "@/lib/events/context";

function Results({ brief }: { brief: Brief }) {
  return (
    <div className="flex flex-col gap-8">
      <Summary brief={brief} />
      {brief.warnings.length > 0 ? (
        <div className="border border-ink/30 bg-accent/10 p-4 text-sm">
          <p className="font-medium">Check these</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {brief.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <Section title="What the judges weigh">
        <Judging brief={brief} />
      </Section>
      <Section title="Submission checklist">
        <Checklist brief={brief} />
      </Section>
      <Section title="Prep plan">
        <Plan brief={brief} />
      </Section>
      <Section title="Key dates">
        <Dates brief={brief} />
      </Section>
      <Section title="Who can enter">
        <SimpleList items={brief.eligibility} empty="The text does not say who can enter." />
      </Section>
      <Section title="Prizes">
        <SimpleList items={brief.prizes.map((line) => line.text)} empty="No prize amounts found." />
      </Section>
      {brief.tracks.length > 0 ? (
        <Section title="Tracks">
          <SimpleList items={brief.tracks.map(({ source }) => source)} empty="" />
        </Section>
      ) : null}
      {brief.rules.length > 0 ? (
        <Section title="Rules that change how you compete">
          <SimpleList items={brief.rules} empty="" />
        </Section>
      ) : null}
    </div>
  );
}

function statusFor(brief: Brief): string {
  const criteria = brief.judging.criteria.length;
  const deadline =
    brief.daysLeft === null ? "no deadline found" : `deadline: ${formatDaysLeft(brief.daysLeft).toLowerCase()}`;
  return `Brief ready: ${criteria} judging ${criteria === 1 ? "criterion" : "criteria"}, ${deadline}.`;
}

function ExternalArrow() {
  return (
    <svg viewBox="0 0 16 16" className="ml-1 inline size-3.5 align-[-1px]" aria-hidden="true">
      <path d="M5.5 4.5h6v6M11.5 4.5 4.5 11.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** A hackathon from the list: what hackbrief knows about it, and how to get its rules in the box. */
// Any day will do here: whether a page gave the brief anything does not depend on today's date.
const FINDINGS_DAY = "2026-01-01";

function pageLabel(url: string): string {
  const page = new URL(url);
  return `${page.hostname.replace(/^www\./, "")}${page.pathname === "/" ? "" : page.pathname}`;
}

/**
 * What came of reading the event's own page. When it held something for the brief, the text goes to
 * the coach, which builds the brief at once; otherwise this says why, and the steps below still apply.
 */
function RulesStatus({
  result,
  host,
  onRead,
}: {
  result: ShownBrief | null;
  host: string;
  onRead: (facts: BriefFacts) => void;
}) {
  const read = result?.status === "built" ? briefFromFacts(result.facts, FINDINGS_DAY) : null;
  const found = read !== null && hasFindings(read);
  useEffect(() => {
    if (found && result?.status === "built") {
      onRead(result.facts);
    }
  }, [found, result, onRead]);

  if (!result) {
    return null;
  }
  if (result.status === "skipped") {
    return result.reason === "off" ? null : (
      <p className="text-sm text-muted">{skippedMessage(result.reason, host)} Paste its rules below instead.</p>
    );
  }
  const [first] = result.pages;
  const more = result.pages.length - 1;
  if (!found || !first) {
    return <p className="text-sm text-muted">hackbrief read its page on {host} but found no rules there. Paste them below.</p>;
  }
  return (
    <p className="border-l-2 border-accent pl-3 text-sm">
      Read its rules from{" "}
      <a href={first} className={`underline underline-offset-4 ${FOCUS_RING}`}>
        {pageLabel(first)}
      </a>
      {more > 0 ? ` and ${more} more ${more === 1 ? "page" : "pages"}` : ""}. Your brief is below; anything it
      misses was not on {more > 0 ? "those pages" : "that page"}, so paste it here to fill it in.
      {read && read.modelFound.length > 0
        ? " A language model read it with hackbrief; every fact comes from a sentence on the page that hackbrief checked."
        : ""}
    </p>
  );
}

function EventPanel({ event, reading }: { event: EventContext; reading: ReactNode }) {
  const steps: ReactNode[] = [
    event.rulesUrl ? (
      <>
        <a
          href={event.rulesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-medium underline underline-offset-4 ${FOCUS_RING}`}
        >
          Open its rules
          <ExternalArrow />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>{" "}
        <span className="text-muted">on {event.host}</span>
      </>
    ) : (
      "Find its rules page"
    ),
    "Copy the rules, the judging criteria and the dates.",
    "Paste them below, then build your brief.",
  ];
  return (
    <section aria-labelledby="event-heading" className={`${SHEET} flex flex-col gap-4 p-5 sm:p-6`}>
      <div className="flex flex-col gap-1.5">
        <p className={LABEL}>Building a brief for</p>
        <h2 id="event-heading" className="text-3xl leading-tight">
          {event.name}
        </h2>
        {event.details ? <p className="text-sm text-muted">{event.details}</p> : null}
        {event.organiser ? <p className="text-sm text-muted">By {event.organiser}</p> : null}
      </div>
      <div role="status" className="border-t border-line pt-4">
        {reading}
      </div>
      <ol className="flex flex-col gap-2.5 text-sm">
        {steps.map((step, position) => (
          <li key={position} className="flex items-start gap-3">
            <Footnote n={position + 1} className="mt-[1px]" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {event.listedBy.length > 0 ? (
        <p className="text-xs text-muted">Listed by {event.listedBy.join(", ")}.</p>
      ) : null}
    </section>
  );
}

/**
 * Tells the coach which event the page shows once the lookup lands, for its listing's dates. The page
 * gives each event a coach of its own (keyed by the event, #78), so a different event never inherits this
 * one's brief. A layout effect, so the dates are in place before the page reader hands over the brief.
 */
function ShowingEvent({ event, onEvent }: { event: EventContext | null; onEvent: (event: EventContext | null) => void }) {
  useLayoutEffect(() => {
    onEvent(event);
  }, [event, onEvent]);
  return null;
}

/** Waits for the reading of the event's own page, inside its own Suspense boundary. */
function WithRules({
  rules,
  children,
}: {
  rules: Promise<ShownBrief | null>;
  children: (result: ShownBrief | null) => ReactNode;
}) {
  return children(use(rules));
}

/**
 * Waits for the event a brief was opened for. Only the parts that name the event sit inside it, so the
 * coach itself renders at once and keeps what has been typed when the lookup lands.
 */
function WithEvent({
  event,
  children,
}: {
  event: Promise<EventContext | null>;
  children: (event: EventContext | null) => ReactNode;
}) {
  return children(use(event));
}

export function Coach({
  event: eventLookup,
  rules: rulesLookup,
}: {
  event: Promise<EventContext | null>;
  rules: Promise<ShownBrief | null>;
}) {
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  // The listed event's dates, which fill in what its rules leave out (`withListingDates`).
  const listing = useRef<ListingDates | undefined>(undefined);

  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const textareaId = useId();
  const hintId = useId();
  const pageId = useId();
  const pageHintId = useId();

  // What has been typed, for the page read to check without re-rendering on every keystroke.
  const typed = useRef("");
  useEffect(() => {
    typed.current = text;
  }, [text]);

  // The event's listing dates, which fill in what pasted rules leave out.
  const showEvent = useCallback((event: EventContext | null) => {
    listing.current = event?.dates;
  }, []);

  // The event's brief, built ahead or on this visit (#60): shown at once, unless the visitor has already
  // started typing rules of their own.
  const acceptRules = useCallback((facts: BriefFacts) => {
    if (typed.current.trim()) {
      return;
    }
    setBrief(briefFromFacts(facts, localToday()));
  }, []);

  // After each new brief renders, move focus to it so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (brief) {
      resultsHeading.current?.focus();
    }
  }, [brief]);

  function build(input: string) {
    setBrief(buildBrief(input, localToday(), { listing: listing.current }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (text.trim()) {
      build(text);
    }
  }

  function trySample(sampleText: string) {
    setText(sampleText);
    build(sampleText);
  }

  return (
    <div className="flex flex-col gap-10">
      <Suspense fallback={null}>
        <WithEvent event={eventLookup}>
          {(event) => (
            <>
              <ShowingEvent event={event} onEvent={showEvent} />
              {event ? (
                <EventPanel
                  event={event}
                  reading={
                    <Suspense
                      fallback={
                        <p className="text-sm text-muted motion-safe:animate-pulse">
                          Building your brief from {event.host ?? "its site"}… The first brief for an event takes a few
                          seconds; after that it opens at once.
                        </p>
                      }
                    >
                      <WithRules rules={rulesLookup}>
                        {(result) => (
                          <RulesStatus result={result} host={event.host ?? "its site"} onRead={acceptRules} />
                        )}
                      </WithRules>
                    </Suspense>
                  }
                />
              ) : null}
            </>
          )}
        </WithEvent>
      </Suspense>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Suspense fallback={null}>
          <WithEvent event={eventLookup}>
            {(event) =>
              event ? null : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={pageId} className="font-medium">
              The hackathon&apos;s page <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id={pageId}
              type="text"
              inputMode="url"
              autoComplete="url"
              aria-describedby={pageHintId}
              value={page}
              onChange={(change) => setPage(change.target.value)}
              placeholder="https://"
              className={`w-full border border-line bg-panel px-3 py-2 font-mono text-sm ${FOCUS_RING}`}
            />
            <p id={pageHintId} className="text-sm text-muted">
              For a hackathon hackbrief does not list. It only labels your brief and links back to the
              page; hackbrief does not open or read it.
            </p>
          </div>
              )
            }
          </WithEvent>
        </Suspense>
        <label htmlFor={textareaId} className="font-medium">
          Hackathon rules and judging text
        </label>
        <textarea
          id={textareaId}
          aria-describedby={hintId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={12}
          spellCheck={false}
          placeholder="Paste the rules page here: dates, eligibility, what to submit and the judging criteria."
          className={`scroll-brand w-full border border-line bg-panel p-3 font-mono text-sm ${FOCUS_RING}`}
        />
        <p id={hintId} className="text-sm text-muted">
          Your text stays in your browser: hackbrief reads it on this page and does not send or store
          it.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!text.trim()}
            className={`bg-ink px-4 py-2 font-medium text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
          >
            Build my brief
          </button>
          {text ? (
            <button
              type="button"
              onClick={() => {
                setText("");
                setBrief(null);
              }}
              className={`px-3 py-2 text-sm font-medium text-muted hover:bg-line/60 ${FOCUS_RING}`}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">No rules to hand? Try a made-up one:</span>
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => trySample(sample.text)}
              className={`border border-line px-3 py-1 hover:bg-line/60 ${FOCUS_RING}`}
            >
              {sample.name}
            </button>
          ))}
        </div>
      </form>

      <p role="status" className="sr-only">
        {brief ? statusFor(brief) : ""}
      </p>

      {brief ? (
        <section aria-labelledby="brief-heading" className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 id="brief-heading" ref={resultsHeading} tabIndex={-1} className="text-3xl focus:outline-none">
              <Suspense fallback="Your brief">
                <WithEvent event={eventLookup}>{(event) => (event ? `Brief: ${event.name}` : "Your brief")}</WithEvent>
              </Suspense>
            </h2>
            <Suspense fallback={null}>
              <WithEvent event={eventLookup}>
                {(event) => {
                  const link = event ? null : pageLink(page);
                  return link ? (
                    <p className="text-sm text-muted">
                      Rules from{" "}
                      <a href={link.url} className={`text-ink underline underline-offset-4 ${FOCUS_RING}`}>
                        {link.host}
                      </a>
                    </p>
                  ) : null;
                }}
              </WithEvent>
            </Suspense>
          </div>
          <Results brief={brief} />
        </section>
      ) : null}
    </div>
  );
}
