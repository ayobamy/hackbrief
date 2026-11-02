"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { buildBrief, localToday } from "@/lib/coach/brief";
import { CARDS, cardOf, tagLines } from "@/lib/coach/highlight";
import {
  formatAmount,
  formatDaysLeft,
  formatLongDate,
  formatSolo,
  formatTeamSize,
} from "@/lib/coach/format";
import { SAMPLES } from "@/lib/coach/samples";
import type { Emphasis } from "@/lib/coach/strategy";

import { Footnote, LABEL, SHEET, Tick } from "./sheet";

// The server renders with this day and the browser hydrates with it, so the two match; the
// visitor's own date takes over straight after, and only then does the countdown show.
const FIRST_RENDER_DAY = "2026-11-02";
const noSubscription = () => () => undefined;
const serverDay = () => null;

// On each sample the coach reads through its four cards once, then rests: under five seconds in
// all, so it needs no pause control (WCAG 2.2.2), and it never runs under reduced motion.
const SCAN_START_MS = 700;
const SCAN_STEP_MS = 750;

const EMPHASIS: Readonly<Record<Emphasis, string>> = {
  focus: "Focus",
  steady: "Steady",
  light: "Light",
};

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The coach running live on the landing page: pick a sample, watch it read the rules. */
export function RulesDemo() {
  const [index, setIndex] = useState(0);
  const today = useSyncExternalStore(noSubscription, localToday, serverDay);
  const [timing, setTiming] = useState<{ chars: number; ms: number } | null>(
    null,
  );
  const [scan, setScan] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [pinned, setPinned] = useState<number | null>(null);
  const rulesRef = useRef<HTMLPreElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const baseId = useId();

  const sample = SAMPLES[index] ?? SAMPLES[0];
  const text = sample?.text ?? "";
  const brief = useMemo(
    () => buildBrief(text, today ?? FIRST_RENDER_DAY),
    [text, today],
  );
  const lines = useMemo(() => tagLines(text, brief), [text, brief]);
  const shown = hovered ?? pinned ?? scan;

  // Time the coach on this sample, in this browser, after the frame paints: the figure in the
  // footer is measured, not set.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const started = performance.now();
      buildBrief(text, localToday());
      setTiming({ chars: text.length, ms: performance.now() - started });
      rulesRef.current?.scrollTo({ top: 0 });
    });
    return () => cancelAnimationFrame(frame);
  }, [text]);

  useEffect(() => {
    if (reducedMotion()) {
      return;
    }
    const timers = [...CARDS.keys()].map((position) =>
      window.setTimeout(
        () => setScan(position),
        SCAN_START_MS + position * SCAN_STEP_MS,
      ),
    );
    timers.push(
      window.setTimeout(
        () => setScan(null),
        SCAN_START_MS + CARDS.length * SCAN_STEP_MS,
      ),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [text]);

  // Bring the first line behind the selected card into view, inside the rules sheet only.
  useEffect(() => {
    const sheet = rulesRef.current;
    const first = sheet?.querySelector<HTMLElement>(`[data-card="${shown}"]`);
    if (!sheet || !first) {
      return;
    }
    sheet.scrollTo({
      top: Math.max(0, first.offsetTop - 56),
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  }, [shown, text]);

  function choose(position: number) {
    setIndex(position);
    setPinned(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const next = (index + step + SAMPLES.length) % SAMPLES.length;
    choose(next);
    tabs.current[next]?.focus();
  }

  if (!sample) {
    return null;
  }
  const { deadline, daysLeft, team, topPrizes, strategy, checklist } = brief;
  const panelId = `${baseId}-panel`;
  const topNote = strategy[0];

  const bodies: ReactNode[] = [
    <div key="deadline" className="flex flex-col gap-1">
      <p className="text-[26px] leading-tight font-semibold tracking-[-0.03em]">
        {deadline ? formatLongDate(deadline.date) : "Not found in the rules"}
      </p>
      <p className="text-sm text-muted">
        {[deadline?.time, today && daysLeft !== null ? formatDaysLeft(daysLeft) : null]
          .filter(Boolean)
          .join(" · ") || " "}
      </p>
    </div>,
    <dl key="team" className="flex flex-col gap-1.5">
      {[
        ["Team", team ? formatTeamSize(team) : "Not stated"],
        ["Solo", team ? formatSolo(team) : "Not stated"],
        ["Top prize", topPrizes[0] ? formatAmount(topPrizes[0]) : "Not stated"],
      ].map(([term, value]) => (
        <div key={term} className="flex items-baseline">
          <dt className="text-sm text-muted">{term}</dt>
          <span className="mx-2 flex-1 translate-y-[-3px] border-b border-dotted border-muted/50" aria-hidden="true" />
          <dd className="text-sm font-medium">{value}</dd>
        </div>
      ))}
    </dl>,
    <div key="points" className="flex flex-col gap-3">
      <ul aria-label="Judging weights" className="flex flex-col gap-2">
        {strategy.map((note) => (
          <li key={`${sample.id}-${note.criterion}`} className="flex flex-col gap-1">
            <div className="flex items-baseline">
              <span className="min-w-0 truncate text-sm">{note.criterion}</span>
              <span className="mx-2 flex-1 translate-y-[-3px] border-b border-dotted border-muted/50" aria-hidden="true" />
              <span className="mr-3 text-xs text-muted">{EMPHASIS[note.emphasis]}</span>
              <span className="w-12 text-right font-mono text-sm tabular-nums">{note.weight}%</span>
            </div>
            <div className="h-[2px] w-full bg-line" aria-hidden="true">
              <div
                className={`bar-grow h-[2px] ${note.emphasis === "focus" ? "bg-ink" : "bg-muted/60"}`}
                style={{ width: `${note.weight}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {topNote ? (
        <p key={`${sample.id}-note`} className="rise-in border-l-2 border-accent pl-3 text-[13px] leading-5 text-muted">
          {topNote.text}
        </p>
      ) : null}
    </div>,
    <ul key="hand-in" className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
      {checklist.slice(0, 6).map((item, position) => (
        <li
          key={`${sample.id}-${item.id}`}
          className="rise-in flex items-start gap-2.5 text-sm"
          style={{ animationDelay: `${150 + position * 70}ms` }}
        >
          <Tick />
          {item.label}
        </li>
      ))}
      {checklist.length > 6 ? <li className="text-sm text-muted">and {checklist.length - 6} more</li> : null}
    </ul>,
  ];

  return (
    <div className={`${SHEET} shadow-card`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-line px-4 pt-3 sm:px-6">
        <div
          role="tablist"
          aria-label="Sample rules"
          className="scroll-brand -mb-px flex max-w-full gap-5 overflow-x-auto"
          onKeyDown={onKeyDown}
        >
          {SAMPLES.map((option, position) => (
            <button
              key={option.id}
              ref={(element) => {
                tabs.current[position] = element;
              }}
              id={`${baseId}-tab-${option.id}`}
              type="button"
              role="tab"
              aria-selected={position === index}
              aria-controls={panelId}
              tabIndex={position === index ? 0 : -1}
              onClick={() => choose(position)}
              className={`shrink-0 border-b-2 pt-1 pb-2.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                position === index ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
        <span className={`${LABEL} hidden pb-3 sm:inline`}>
          Sample {index + 1} of {SAMPLES.length}, read in your browser
        </span>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${sample.id}`}
        className="grid md:grid-cols-[1fr_1.1fr] md:divide-x md:divide-line"
      >
        <div className="hidden md:block">
          <div className="flex items-baseline justify-between px-6 pt-5 pb-3">
            <span className={LABEL}>The rules, as pasted</span>
            <span className={LABEL}>Fictional event</span>
          </div>
          <pre
            ref={rulesRef}
            className="scroll-brand relative h-[480px] overflow-auto pb-4 font-mono text-[11.5px] leading-[1.8] whitespace-pre-wrap"
            tabIndex={0}
            role="region"
            aria-label={`The rules of ${sample.name}`}
          >
            {lines.map(({ line, tag }, position) => {
              const card = tag ? cardOf(tag) : null;
              const lit = card !== null && card === shown;
              const style =
                card === null
                  ? shown === null
                    ? "text-muted"
                    : "text-muted/60"
                  : lit
                    ? "bg-accent/25 text-ink"
                    : shown === null
                      ? "bg-accent/10 text-ink"
                      : "text-ink/60";
              return (
                <span
                  key={`${sample.id}-${position}`}
                  data-card={card ?? undefined}
                  className={`flex items-start justify-between gap-3 px-6 transition-colors duration-300 motion-reduce:transition-none ${style}`}
                >
                  <span>{line || " "}</span>
                  {card !== null ? <Footnote n={card + 1} active={lit} className="mt-[2px]" /> : null}
                </span>
              );
            })}
          </pre>
        </div>

        <div className="flex flex-col px-4 pt-5 pb-4 sm:px-6">
          <span className={LABEL}>The brief</span>
          <p className="mt-1 text-xl leading-tight font-semibold tracking-[-0.02em]">{sample.name}</p>
          <ol className="mt-4 flex flex-col border-b border-line">
            {CARDS.map((card, position) => {
              const selected = shown === position;
              return (
                <li
                  key={`${sample.id}-${card.title}`}
                  className={`flex gap-3 border-t border-line py-4 transition-colors duration-300 motion-reduce:transition-none ${
                    selected ? "bg-accent/[0.07]" : ""
                  }`}
                  onMouseEnter={() => setHovered(position)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <Footnote n={position + 1} active={selected} className="mt-[1px]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className={LABEL}>{card.title}</p>
                      <button
                        type="button"
                        aria-pressed={pinned === position}
                        aria-label={`Show in the rules: ${card.title}`}
                        onClick={() => setPinned(pinned === position ? null : position)}
                        onFocus={() => setHovered(position)}
                        onBlur={() => setHovered(null)}
                        className="hidden font-mono text-[11px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:text-ink aria-pressed:decoration-accent md:inline"
                      >
                        Show in the rules
                      </button>
                    </div>
                    {bodies[position]}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 hidden text-xs text-muted md:block">
            Hover over or select any part of the brief to highlight the lines it came from.
          </p>
        </div>
      </div>

      <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 font-mono text-[11px] text-muted sm:px-6">
        <span>
          {timing
            ? `Read ${timing.chars.toLocaleString("en")} characters in ${timing.ms < 1 ? timing.ms.toFixed(1) : Math.round(timing.ms)} ms`
            : `Read ${text.length.toLocaleString("en")} characters`}
        </span>
        <span>Nothing sent, nothing stored</span>
      </p>
    </div>
  );
}
