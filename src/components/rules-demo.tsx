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
  formatDate,
  formatDaysLeft,
  formatSolo,
  formatTeamSize,
} from "@/lib/coach/format";
import { SAMPLES } from "@/lib/coach/samples";
import type { Emphasis } from "@/lib/coach/strategy";

import { CARD, CHIP, Canvas, Check, Handles, StepBadge } from "./canvas";

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

// Shades of the one accent for the rubric bar, heaviest criterion first.
const SHADES = [1, 0.7, 0.45, 0.28, 0.18, 0.12];

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
    <div key="deadline" className="flex flex-col gap-2">
      <p className="text-2xl font-semibold tracking-[-0.03em]">
        {deadline ? formatDate(deadline.date) : "Not found"}
      </p>
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {deadline?.time ?? "No time given"}
        {today && daysLeft !== null ? (
          <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-ink">
            {formatDaysLeft(daysLeft)}
          </span>
        ) : null}
      </p>
    </div>,
    <ul key="team" className="flex flex-wrap gap-2">
      <li className={CHIP}>
        {team ? formatTeamSize(team) : "Team size not stated"}
      </li>
      {team ? <li className={CHIP}>{formatSolo(team)}</li> : null}
      <li className={CHIP}>
        {topPrizes[0] ? (
          <>
            <span className="text-muted">Top prize</span>
            <span className="font-medium">{formatAmount(topPrizes[0])}</span>
          </>
        ) : (
          "No prize stated"
        )}
      </li>
    </ul>,
    <div key="points" className="flex flex-col gap-4">
      <div
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full"
        aria-hidden="true"
      >
        {strategy.map((note, rank) => (
          <span
            key={`${sample.id}-${note.criterion}`}
            className="bar-grow h-full rounded-[2px] bg-accent"
            style={{
              width: `${note.weight}%`,
              opacity: SHADES[rank] ?? 0.1,
              animationDelay: `${rank * 80}ms`,
            }}
          />
        ))}
      </div>
      <ul aria-label="Judging weights" className="flex flex-col gap-2">
        {strategy.map((note, rank) => (
          <li
            key={`${sample.id}-${note.criterion}`}
            className="flex items-center gap-2.5 text-sm"
          >
            <span
              className="size-2.5 shrink-0 rounded-[3px] bg-accent"
              style={{ opacity: SHADES[rank] ?? 0.1 }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate">{note.criterion}</span>
            <span className="text-xs text-muted">
              {EMPHASIS[note.emphasis]}
            </span>
            <span className="w-10 text-right font-mono tabular-nums">
              {note.weight}%
            </span>
          </li>
        ))}
      </ul>
      {topNote ? (
        <p
          key={`${sample.id}-note`}
          className="rise-in border-l-2 border-accent pl-3 text-[13px] leading-5 text-muted"
        >
          {topNote.text}
        </p>
      ) : null}
    </div>,
    <ul key="hand-in" className="flex flex-wrap gap-2">
      {checklist.slice(0, 5).map((item, position) => (
        <li
          key={`${sample.id}-${item.id}`}
          className={`${CHIP} rise-in`}
          style={{ animationDelay: `${150 + position * 70}ms` }}
        >
          <Check className="size-3.5" />
          {item.label}
        </li>
      ))}
      {checklist.length > 5 ? (
        <li className={`${CHIP} text-muted`}>+{checklist.length - 5} more</li>
      ) : null}
    </ul>,
  ];

  return (
    <Canvas>
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 pt-3 sm:px-5 sm:pt-5">
        <div
          role="tablist"
          aria-label="Sample rules"
          className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-paper/80 p-1 backdrop-blur [scrollbar-width:none]"
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
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                position === index
                  ? "bg-ink text-paper"
                  : "text-muted hover:text-ink"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-2 rounded-full border border-line bg-paper/80 px-3 py-1.5 text-xs text-muted backdrop-blur">
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
        className="grid grid-cols-1 gap-5 p-3 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8"
      >
        {/* The sheet takes the height of the card column beside it and scrolls inside. */}
        <div className={`${CARD} hidden flex-col overflow-hidden md:flex`}>
          <div className="flex items-center justify-between border-b border-line px-5 py-3 text-xs text-muted">
            <span>Pasted rules</span>
            <span className="rounded-full border border-line px-2 py-0.5">
              Fictional
            </span>
          </div>
          <div className="relative min-h-[420px] flex-1">
            <pre
              ref={rulesRef}
              className="absolute inset-0 overflow-auto py-3 font-mono text-[11.5px] leading-[1.75] whitespace-pre-wrap"
              tabIndex={0}
              role="region"
              aria-label={`The rules of ${sample.name}`}
            >
              {lines.map(({ line, tag }, position) => {
                const card = tag ? cardOf(tag) : null;
                const lit = card !== null && card === shown;
                const style =
                  card === null
                    ? `border-transparent ${shown === null ? "text-muted" : "text-muted/60"}`
                    : lit
                      ? "border-accent bg-accent/15 text-ink"
                      : shown === null
                        ? "border-accent/40 bg-accent/[0.06] text-ink"
                        : "border-transparent bg-accent/[0.03] text-ink/60";
                return (
                  <span
                    key={`${sample.id}-${position}`}
                    data-card={card ?? undefined}
                    className={`flex items-start justify-between gap-3 border-l-2 px-5 transition-colors duration-300 motion-reduce:transition-none ${style}`}
                  >
                    <span>{line || " "}</span>
                    {card !== null ? (
                      <span
                        className={`mt-[3px] flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] transition-colors duration-300 motion-reduce:transition-none ${
                          lit
                            ? "bg-accent text-on-accent"
                            : "border border-line text-muted"
                        }`}
                        aria-hidden="true"
                      >
                        {card + 1}
                      </span>
                    ) : null}
                  </span>
                );
              })}
            </pre>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <ol className="relative flex flex-col gap-4 pl-11">
            <span
              className="absolute top-5 bottom-5 left-[13px] w-px bg-line"
              aria-hidden="true"
            />
            {CARDS.map((card, position) => {
              const selected = shown === position;
              return (
                <li
                  key={`${sample.id}-${card.title}`}
                  className="rise-in relative"
                  style={{ animationDelay: `${position * 90}ms` }}
                  onMouseEnter={() => setHovered(position)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <StepBadge
                    n={position + 1}
                    active={selected}
                    className="absolute top-4 -left-11"
                  />
                  <div
                    className={`${CARD} relative flex flex-col gap-3 p-4 transition-colors duration-300 motion-reduce:transition-none sm:p-5 ${
                      selected ? "border-ink/25" : ""
                    }`}
                  >
                    {selected ? <Handles /> : null}
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-muted">
                        {card.title}
                      </p>
                      <button
                        type="button"
                        aria-pressed={pinned === position}
                        aria-label={`Show in the rules: ${card.title}`}
                        onClick={() =>
                          setPinned(pinned === position ? null : position)
                        }
                        onFocus={() => setHovered(position)}
                        onBlur={() => setHovered(null)}
                        className="hidden rounded-full px-2 py-0.5 text-xs text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:bg-accent/15 aria-pressed:text-ink md:inline-flex"
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
          <p className="hidden pl-11 text-xs text-muted md:block">
            Point at a card to see the lines it came from.
          </p>
        </div>
      </div>

      <div className="flex justify-center px-3 pb-4 sm:pb-5">
        <p className="flex flex-wrap items-center justify-center gap-x-2 rounded-full border border-line bg-paper/80 px-4 py-1.5 text-xs text-muted backdrop-blur">
          <span>
            {timing
              ? `Read ${timing.chars.toLocaleString("en")} characters in ${timing.ms < 1 ? timing.ms.toFixed(1) : Math.round(timing.ms)} ms`
              : `Read ${text.length.toLocaleString("en")} characters`}
          </span>
          <span aria-hidden="true">·</span>
          <span>Nothing sent, nothing stored</span>
        </p>
      </div>
    </Canvas>
  );
}
