"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";

import { buildBrief, localToday } from "@/lib/coach/brief";
import { tagLines } from "@/lib/coach/highlight";
import {
  formatAmount,
  formatDate,
  formatDaysLeft,
  formatSolo,
  formatTeamSize,
} from "@/lib/coach/format";
import { SAMPLES } from "@/lib/coach/samples";
import type { Emphasis } from "@/lib/coach/strategy";

const LABEL = "font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted";

// The server renders with this day and the browser hydrates with it, so the two match; the
// visitor's own date takes over straight after, and only then does the countdown show.
const FIRST_RENDER_DAY = "2026-11-02";
const noSubscription = () => () => undefined;
const serverDay = () => null;

const EMPHASIS: Readonly<Record<Emphasis, { label: string; style: string }>> = {
  focus: { label: "Focus", style: "bg-accent/15 text-ink" },
  steady: { label: "Steady", style: "bg-line text-ink" },
  light: { label: "Light", style: "text-muted ring-1 ring-line" },
};

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="size-4 shrink-0" aria-hidden="true">
      <rect width="16" height="16" rx="4" fill="var(--accent)" />
      <path
        d="M4.5 8.2 7 10.6l4.6-5.2"
        fill="none"
        stroke="var(--paper)"
        strokeWidth="1.8"
      />
    </svg>
  );
}

/** The coach running live on the landing page: pick a sample, watch the brief build itself. */
export function RulesDemo() {
  const [index, setIndex] = useState(0);
  const today = useSyncExternalStore(noSubscription, localToday, serverDay);
  const [timing, setTiming] = useState<{ chars: number; ms: number } | null>(
    null,
  );
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

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) {
      return;
    }
    event.preventDefault();
    const next = (index + step + SAMPLES.length) % SAMPLES.length;
    setIndex(next);
    tabs.current[next]?.focus();
  }

  if (!sample) {
    return null;
  }
  const { deadline, daysLeft, team, topPrizes, strategy, checklist } = brief;
  const panelId = `${baseId}-panel`;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-ink/10 dark:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div
          role="tablist"
          aria-label="Sample rules"
          className="flex flex-wrap gap-1"
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
              onClick={() => setIndex(position)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                position === index
                  ? "bg-ink text-paper"
                  : "text-muted hover:bg-line/60 hover:text-ink"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
        <span className={`${LABEL} flex items-center gap-2`}>
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>
          The coach, running in your browser
        </span>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${sample.id}`}
        className="grid md:grid-cols-[1fr_1.08fr]"
      >
        <div className="hidden border-r border-line md:block">
          <div className={`${LABEL} border-b border-line px-5 py-2.5`}>
            Pasted rules · fictional
          </div>
          <pre
            ref={rulesRef}
            className="h-[430px] overflow-auto px-0 py-3 font-mono text-[11.5px] leading-[1.7] whitespace-pre-wrap"
            tabIndex={0}
            role="region"
            aria-label={`The rules of ${sample.name}`}
          >
            {lines.map(({ line, tag }, position) => (
              <span
                key={`${sample.id}-${position}`}
                className={`flex items-start justify-between gap-3 border-l-2 px-5 ${
                  tag
                    ? "rise-in border-accent bg-accent/[0.07] text-ink"
                    : "border-transparent text-muted"
                }`}
                style={
                  tag
                    ? { animationDelay: `${Math.min(position * 25, 600)}ms` }
                    : undefined
                }
              >
                <span>{line || " "}</span>
                {tag ? (
                  <span className="shrink-0 pt-px text-[9.5px] tracking-[0.12em] text-muted uppercase">
                    {tag}
                  </span>
                ) : null}
              </span>
            ))}
          </pre>
        </div>

        <div className="flex flex-col">
          <dl className="grid grid-cols-3 border-b border-line">
            <div className="flex flex-col gap-1 border-r border-line px-4 py-4 sm:px-5">
              <dt className={LABEL}>Deadline</dt>
              <dd className="text-sm font-medium">
                {deadline ? formatDate(deadline.date) : "Not found"}
              </dd>
              <dd className="text-xs text-muted">
                {deadline?.time ?? ""}
                {today && daysLeft !== null ? (
                  <span className="ml-1 rounded bg-accent/15 px-1.5 py-0.5 text-[11px] text-ink">
                    {formatDaysLeft(daysLeft)}
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="flex flex-col gap-1 border-r border-line px-4 py-4 sm:px-5">
              <dt className={LABEL}>Team</dt>
              <dd className="text-sm font-medium">
                {team ? formatTeamSize(team) : "Not stated"}
              </dd>
              {team ? (
                <dd className="text-xs text-muted">{formatSolo(team)}</dd>
              ) : null}
            </div>
            <div className="flex flex-col gap-1 px-4 py-4 sm:px-5">
              <dt className={LABEL}>Top prize</dt>
              <dd className="text-sm font-medium">
                {topPrizes[0] ? formatAmount(topPrizes[0]) : "Not stated"}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:px-5">
            <div className="flex items-baseline justify-between">
              <span className={LABEL}>Where the points are</span>
              <span className={`${LABEL} hidden sm:inline`}>
                {brief.judging.unit === "points"
                  ? "From points"
                  : "From percentages"}
              </span>
            </div>
            <ul className="flex flex-col gap-3">
              {strategy.map((note) => (
                <li
                  key={`${sample.id}-${note.criterion}`}
                  className="flex flex-col gap-1.5"
                >
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      {note.criterion}
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10.5px] font-medium ${EMPHASIS[note.emphasis].style}`}
                      >
                        {EMPHASIS[note.emphasis].label}
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">
                      {note.weight}%
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full rounded-full bg-line"
                    aria-hidden="true"
                  >
                    <div
                      className="bar-grow h-1.5 rounded-full bg-accent"
                      style={{ width: `${note.weight}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            {strategy[0] ? (
              <p
                key={`${sample.id}-note`}
                className="rise-in text-[13px] leading-5 text-muted"
              >
                {strategy[0].text}
              </p>
            ) : null}
          </div>

          <div className="flex flex-1 flex-col gap-2 px-4 py-4 sm:px-5">
            <span className={LABEL}>To hand in</span>
            <ul className="flex flex-col gap-1.5">
              {checklist.slice(0, 5).map((item, position) => (
                <li
                  key={`${sample.id}-${item.id}`}
                  className="rise-in flex items-center gap-2.5 text-sm"
                  style={{ animationDelay: `${200 + position * 90}ms` }}
                >
                  <Check />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div
        className={`${LABEL} flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5`}
      >
        <span>
          {timing
            ? `Read ${timing.chars.toLocaleString("en")} characters in ${timing.ms < 1 ? timing.ms.toFixed(1) : Math.round(timing.ms)} ms`
            : `Read ${text.length.toLocaleString("en")} characters`}
        </span>
        <span>Nothing sent, nothing stored</span>
      </div>
    </div>
  );
}
