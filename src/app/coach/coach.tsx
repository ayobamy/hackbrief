"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";

import { buildBrief, localToday, type Brief } from "@/lib/coach/brief";
import { formatAmount, formatDate, formatDaysLeft, formatSolo, formatTeamSize } from "@/lib/coach/format";
import { SAMPLES } from "@/lib/coach/samples";
import type { Emphasis } from "@/lib/coach/strategy";

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const EMPHASIS_LABEL: Readonly<Record<Emphasis, string>> = {
  focus: "Focus",
  steady: "Keep steady",
  light: "Light touch",
};

const EMPHASIS_STYLE: Readonly<Record<Emphasis, string>> = {
  focus: "bg-accent/15 text-ink",
  steady: "bg-line text-ink",
  light: "bg-paper text-muted ring-1 ring-line",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="text-lg font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail?: string | null }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line p-4">
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
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${EMPHASIS_STYLE[note.emphasis]}`}>
                {EMPHASIS_LABEL[note.emphasis]}
              </span>
              <span className="font-semibold tabular-nums">{note.weight}%</span>
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-line" aria-hidden="true">
            <div className="h-2 rounded-full bg-accent" style={{ width: `${note.weight}%` }} />
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
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
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

export function Coach() {
  const [text, setText] = useState("");
  const [brief, setBrief] = useState<Brief | null>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const textareaId = useId();
  const hintId = useId();

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
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          className={`w-full rounded-lg border border-line bg-panel p-3 font-mono text-sm ${FOCUS_RING}`}
        />
        <p id={hintId} className="text-sm text-muted">
          Your text stays in your browser: hackr reads it on this page and does not send or store
          it.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={!text.trim()}
            className={`rounded-lg bg-ink px-4 py-2 font-medium text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
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
              className={`rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-line/60 ${FOCUS_RING}`}
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
              className={`rounded-full border border-line px-3 py-1 hover:bg-line/60 ${FOCUS_RING}`}
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
          <h2 id="brief-heading" ref={resultsHeading} tabIndex={-1} className="text-2xl font-semibold tracking-tight focus:outline-none">
            Your brief
          </h2>
          <Results brief={brief} />
        </section>
      ) : null}
    </div>
  );
}
