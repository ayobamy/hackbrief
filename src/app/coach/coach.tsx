"use client";

import { Suspense, use, useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { buildBrief, hasFindings, localToday, type Brief } from "@/lib/coach/brief";
import { formatAmount, formatDate, formatDaysLeft, formatSolo, formatTeamSize } from "@/lib/coach/format";
import { SAMPLES } from "@/lib/coach/samples";
import type { Emphasis } from "@/lib/coach/strategy";
import { Footnote, LABEL, SHEET } from "@/components/sheet";
import { pageLink, type EventContext } from "@/lib/events/context";
import type { ReadResult, SkipReason } from "@/lib/rules/read";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const EMPHASIS_LABEL: Readonly<Record<Emphasis, string>> = {
  focus: "Focus",
  steady: "Keep steady",
  light: "Light touch",
};

const EMPHASIS_STYLE: Readonly<Record<Emphasis, string>> = {
  focus: "bg-accent/25 text-ink",
  steady: "text-ink",
  light: "text-muted",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-2xl">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail?: string | null }) {
  return (
    <div className="flex flex-col gap-1 border border-line p-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
      {detail ? <dd className="text-sm text-muted">{detail}</dd> : null}
    </div>
  );
}

function Summary({ brief }: { brief: Brief }) {
  const { deadline, daysLeft, team, topPrizes } = brief;
  return (
    <dl className="grid gap-3 sm:grid-cols-3">
      <Fact
        label="Submission deadline"
        value={deadline && daysLeft !== null ? formatDaysLeft(daysLeft) : "Not found"}
        detail={deadline ? `${formatDate(deadline.date)}${deadline.time ? `, ${deadline.time}` : ""}` : null}
      />
      <Fact label="Team" value={team ? formatTeamSize(team) : "Not stated"} detail={team ? formatSolo(team) : null} />
      <Fact
        label="Top prize"
        value={topPrizes.length > 0 ? topPrizes.map(formatAmount).join(" · ") : "Not stated"}
      />
    </dl>
  );
}

function Judging({ brief }: { brief: Brief }) {
  if (brief.strategy.length === 0) {
    return <p className="text-muted">No judging criteria found in the text.</p>;
  }
  return (
    <ol className="flex flex-col gap-4">
      {brief.strategy.map((note) => (
        <li key={note.criterion} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium">{note.criterion}</span>
            <span className="flex items-center gap-2 text-sm">
              <span className={`px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.1em] uppercase ${EMPHASIS_STYLE[note.emphasis]}`}>
                {EMPHASIS_LABEL[note.emphasis]}
              </span>
              <span className="font-semibold tabular-nums">{note.weight}%</span>
            </span>
          </div>
          <div className="h-[2px] w-full bg-line" aria-hidden="true">
            <div className={`h-[2px] ${note.emphasis === "focus" ? "bg-ink" : "bg-muted/60"}`} style={{ width: `${note.weight}%` }} />
          </div>
          <p className="text-sm text-muted">{note.text}</p>
        </li>
      ))}
    </ol>
  );
}

function Checklist({ brief }: { brief: Brief }) {
  if (brief.checklist.length === 0) {
    return <p className="text-muted">The text does not list what to submit.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {brief.checklist.map((item) => (
        <li key={item.id}>
          <label className="flex items-start gap-3">
            <input type="checkbox" className={`mt-1 size-4 accent-accent ${FOCUS_RING}`} />
            <span className="flex flex-col">
              <span className="font-medium">{item.label}</span>
              <span className="text-sm text-muted">From the rules: “{item.source}”</span>
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function Dates({ brief }: { brief: Brief }) {
  if (brief.dates.length === 0) {
    return <p className="text-muted">No dates found in the text.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr>
            <th scope="col" className="py-2 pr-4 font-medium">What</th>
            <th scope="col" className="py-2 pr-4 font-medium">Date</th>
            <th scope="col" className="py-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {brief.dates.map((date, index) => (
            <tr key={`${date.date}-${index}`} className="border-t border-line">
              <td className="py-2 pr-4">{date.label}</td>
              <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                {formatDate(date.date)}
                {date.yearAssumed ? <span className="text-muted"> (year assumed)</span> : null}
              </td>
              <td className="py-2 whitespace-nowrap">{date.time ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Plan({ brief }: { brief: Brief }) {
  if (brief.plan.length === 0) {
    return <p className="text-muted">A prep plan needs a submission deadline.</p>;
  }
  return (
    <ol className="flex flex-col gap-3">
      {brief.plan.map((step) => {
        const passed = step.daysFromToday < 0;
        return (
          <li key={step.title} className={`flex flex-col gap-1 border-l-2 pl-4 ${passed ? "border-line opacity-60" : "border-accent"}`}>
            <span className="text-sm text-muted tabular-nums">
              {formatDate(step.date)} · {formatDaysLeft(step.daysFromToday)}
              {passed ? " (passed)" : ""}
            </span>
            <span className="font-medium">{step.title}</span>
            <span className="text-sm text-muted">{step.detail}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SimpleList({ items, empty }: { items: readonly string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-muted">{empty}</p>;
  }
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

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

const SKIPPED: Readonly<Record<Exclude<SkipReason, "off">, (host: string) => string>> = {
  restricted: (host) => `Its rules are on ${host}, which asks to be asked first, so hackbrief does not read it.`,
  robots: (host) => `${host} asks automated readers to leave this page alone, so hackbrief does.`,
  unreachable: (host) => `hackbrief could not reach ${host} just now.`,
  "not-html": (host) => `${host} gives its rules in a form hackbrief cannot read yet.`,
  empty: (host) => `${host} draws its page with JavaScript or keeps its rules elsewhere, so hackbrief found nothing to read.`,
};

/**
 * What came of reading the event's own page. When it held something for the brief, the text goes to
 * the coach, which builds the brief at once; otherwise this says why, and the steps below still apply.
 */
function RulesStatus({
  result,
  host,
  onRead,
}: {
  result: ReadResult | null;
  host: string;
  onRead: (text: string) => void;
}) {
  const found = result?.status === "read" && hasFindings(buildBrief(result.text, FINDINGS_DAY));
  useEffect(() => {
    if (found && result?.status === "read") {
      onRead(result.text);
    }
  }, [found, result, onRead]);

  if (!result) {
    return null;
  }
  if (result.status === "skipped") {
    return result.reason === "off" ? null : (
      <p className="text-sm text-muted">{SKIPPED[result.reason](host)} Paste its rules below instead.</p>
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

/** Waits for the reading of the event's own page, inside its own Suspense boundary. */
function WithRules({
  rules,
  children,
}: {
  rules: Promise<ReadResult | null>;
  children: (result: ReadResult | null) => ReactNode;
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
  rules: Promise<ReadResult | null>;
}) {
  const [text, setText] = useState("");
  const [page, setPage] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
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

  // The event's own page held its rules: fill the box and build the brief at once, unless the visitor
  // has already started typing their own.
  const acceptRules = useCallback((rules: string) => {
    if (typed.current.trim()) {
      return;
    }
    setText(rules);
    setBrief(buildBrief(rules, localToday()));
  }, []);

  // After each new brief renders, move focus to it so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (brief) {
      resultsHeading.current?.focus();
    }
  }, [brief]);

  function build(input: string) {
    setBrief(buildBrief(input, localToday()));
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
          {(event) =>
            event ? (
              <EventPanel
                event={event}
                reading={
                  <Suspense
                    fallback={
                      <p className="text-sm text-muted motion-safe:animate-pulse">
                        Reading its rules on {event.host ?? "its site"}…
                      </p>
                    }
                  >
                    <WithRules rules={rulesLookup}>
                      {(result) => <RulesStatus result={result} host={event.host ?? "its site"} onRead={acceptRules} />}
                    </WithRules>
                  </Suspense>
                }
              />
            ) : null
          }
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
          className={`w-full border border-line bg-panel p-3 font-mono text-sm ${FOCUS_RING}`}
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
