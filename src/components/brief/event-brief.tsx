"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import { LABEL, SHEET } from "@/components/sheet";
import { keyDates, type KeyDateRow } from "@/lib/briefs/dates";
import { briefFromFacts, localToday, type Brief, type BriefFacts } from "@/lib/coach/brief";
import { formatDate, formatDaysLeft, formatSolo, formatTeamSize } from "@/lib/coach/format";

import { Checklist, FOCUS_RING, Judging, Plan, Section, SimpleList } from "./sections";

const noSubscription = () => () => {};

function pagePath(url: string): string {
  const page = new URL(url);
  return `${page.hostname.replace(/^www\./, "")}${page.pathname === "/" ? "" : page.pathname}`;
}

/** One of the facts at the top of a brief, with the sentence of the rules it rests on a click away. */
function KeyFact({ label, value, detail, source }: { label: string; value: string; detail?: string | null; source?: string | null }) {
  return (
    <div className={`${SHEET} flex flex-col gap-1 p-4`}>
      <dt className={LABEL}>{label}</dt>
      <dd className={value.length > 40 ? "text-base font-medium" : "text-xl font-semibold"}>{value}</dd>
      {detail ? <dd className="text-sm text-muted">{detail}</dd> : null}
      {source ? (
        <dd className="text-sm">
          <details>
            <summary className={`cursor-pointer text-muted underline underline-offset-4 ${FOCUS_RING}`}>From the rules</summary>
            <p className="mt-1 text-muted">“{source}”</p>
          </details>
        </dd>
      ) : null}
    </div>
  );
}

function deadlineDetail(brief: Brief): string | null {
  const { deadline } = brief;
  if (!deadline) {
    return null;
  }
  const when = `${formatDate(deadline.date)}${deadline.time ? `, ${deadline.time}` : ""}`;
  if (deadline.fromListing) {
    return `${when}: the event's last day, from its listing`;
  }
  return deadline.standIn ? `${when}: the event's last day, from its page` : when;
}

function KeyDates({ rows }: { rows: readonly KeyDateRow[] }) {
  if (rows.length === 0) {
    return <p className="text-muted">No dates found on its pages.</p>;
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
          {rows.map((row) => (
            <tr key={`${row.date}-${row.name}`} className="border-t border-line">
              <td className="py-2 pr-4" title={row.source}>
                {row.name}
              </td>
              <td className="py-2 pr-4 whitespace-nowrap tabular-nums">
                {formatDate(row.date)}
                {row.yearAssumed ? <span className="text-muted"> (year assumed)</span> : null}
              </td>
              <td className="py-2 whitespace-nowrap">{row.time ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Shares the brief's address: the system's share sheet where there is one, else a copy of the link. */
function ShareButton({ title }: { title: string }) {
  const [status, setStatus] = useState("");
  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        // Closing the share sheet is a choice, not a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied.");
    } catch {
      setStatus(`Copy this link: ${url}`);
    }
  }
  return (
    <>
      <button type="button" onClick={share} className={`border border-line px-3 py-1.5 text-sm font-medium hover:border-ink ${FOCUS_RING}`}>
        Share this brief
      </button>
      <span role="status" className="text-sm text-muted">
        {status}
      </span>
    </>
  );
}

/**
 * A listed event's brief on its own page (#62): the facts first, each with the sentence it rests on,
 * then what to hand in, the judging, the plan, prizes, tracks and rules, and the key dates. The days left
 * and the plan follow the visitor's own calendar once the page is live, and the server's until then, so
 * both render alike.
 */
export function EventBrief({
  eventId,
  eventName,
  facts,
  pages,
  serverToday,
}: {
  eventId: string;
  eventName: string;
  facts: BriefFacts;
  pages: readonly string[];
  serverToday: string;
}) {
  const today = useSyncExternalStore(noSubscription, localToday, () => serverToday);
  const brief = briefFromFacts(facts, today);
  const [first, ...more] = brief.eligibility;
  const [firstPage] = pages;
  const extraPages = pages.length - 1;
  const sections: ReactNode[] = [
    <Section key="checklist" title="What to hand in">
      <Checklist brief={brief} storageKey={`hackbrief:checklist:${eventId}`} empty="Its pages do not list what to hand in." />
    </Section>,
    <Section key="judging" title="What the judges weigh">
      <Judging brief={brief} empty="Its pages give no judging criteria." />
    </Section>,
    <Section key="plan" title="Your plan">
      <Plan brief={brief} />
    </Section>,
    <Section key="eligibility" title="Who can enter">
      <SimpleList items={brief.eligibility} empty="Its pages do not say who can enter." />
    </Section>,
    <Section key="prizes" title="Prizes">
      <SimpleList items={brief.prizes.map((line) => line.text)} empty="No prize amounts found." />
    </Section>,
  ];
  if (brief.tracks.length > 0) {
    sections.push(
      <Section key="tracks" title="Tracks">
        <SimpleList items={brief.tracks.map(({ source }) => source)} empty="" />
      </Section>,
    );
  }
  if (brief.rules.length > 0) {
    sections.push(
      <Section key="rules" title="Rules that change how you compete">
        <SimpleList items={brief.rules} empty="" />
      </Section>,
    );
  }
  sections.push(
    <Section key="dates" title="Key dates">
      <KeyDates rows={keyDates(brief.dates)} />
    </Section>,
  );

  return (
    <div className="flex flex-col gap-10">
      {firstPage ? (
        <p className="border-l-2 border-accent pl-3 text-sm">
          Prepared from{" "}
          <a href={firstPage} className={`underline underline-offset-4 ${FOCUS_RING}`}>
            {pagePath(firstPage)}
          </a>
          {extraPages > 0 ? ` and ${extraPages} more ${extraPages === 1 ? "page" : "pages"}` : ""}.
          {brief.modelFound.length > 0 ? " A language model read it with hackbrief; every fact comes from a sentence on the page that hackbrief checked." : ""}
        </p>
      ) : null}
      <dl className="grid gap-3 sm:grid-cols-3">
        <KeyFact
          label="Deadline"
          value={brief.deadline && brief.daysLeft !== null ? formatDaysLeft(brief.daysLeft) : "Not found"}
          detail={deadlineDetail(brief)}
          source={brief.deadline && !brief.deadline.fromListing ? brief.deadline.source : null}
        />
        <KeyFact label="Team" value={brief.team ? formatTeamSize(brief.team) : "Not stated"} detail={brief.team ? formatSolo(brief.team) : null} source={brief.team?.source} />
        <KeyFact label="Can you enter?" value={first ?? "Not stated"} detail={more.length > 0 ? `And ${more.length} more below.` : null} />
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        {brief.deadline ? (
          <a
            href={`/events/${eventId}/deadline.ics`}
            download
            className={`bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:opacity-90 ${FOCUS_RING}`}
          >
            Add the deadline to your calendar
          </a>
        ) : null}
        <ShareButton title={`${eventName}: the brief on hackbrief`} />
      </div>
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
      {sections}
      <p className="border-t border-line pt-6 text-sm">
        Something missing or wrong?{" "}
        <Link href={`/coach?event=${eventId}`} className={`font-medium underline underline-offset-4 ${FOCUS_RING}`}>
          Paste its rules into the coach
        </Link>
        .
      </p>
    </div>
  );
}
