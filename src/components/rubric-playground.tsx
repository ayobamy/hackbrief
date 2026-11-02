"use client";

import { useId, useMemo, useState } from "react";

import { CRITERIA, rubricFrom, START } from "@/lib/coach/rubric";
import { buildStrategy } from "@/lib/coach/strategy";

// Square cards that lift off a dotted surface, as Ahmed asked to keep for this part (issue #32).
const CARD = "border border-line bg-panel shadow-card";

// Shades of the one accent, heaviest criterion first.
const SHADES = [1, 0.7, 0.45, 0.28];

/** Change a rubric's weights and watch the coach rewrite its advice, live. */
export function RubricPlayground() {
  const [stated, setStated] = useState<number[]>(START);
  const baseId = useId();
  const rubric = useMemo(() => rubricFrom(stated), [stated]);
  const notes = useMemo(() => buildStrategy(rubric), [rubric]);
  const total = rubric.statedTotal ?? 0;

  return (
    <div className="relative overflow-hidden border border-line bg-panel/40 p-3 sm:p-5">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-80" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-40 -right-32 h-80 w-[28rem] rounded-full bg-accent/[0.07] blur-3xl"
        aria-hidden="true"
      />
      <div className="relative grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-5">
        <div className={`${CARD} flex flex-col gap-5 p-5 sm:p-6`}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">The rubric says</span>
            <button
              type="button"
              onClick={() => setStated(START)}
              className="border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-ink hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Reset
            </button>
          </div>
          {CRITERIA.map((name, index) => (
            <div key={name} className="flex flex-col gap-2">
              <label htmlFor={`${baseId}-${index}`} className="flex items-baseline justify-between text-sm">
                <span>{name}</span>
                <span className="font-mono tabular-nums">{stated[index]}%</span>
              </label>
              <input
                id={`${baseId}-${index}`}
                type="range"
                min={0}
                max={60}
                step={5}
                value={stated[index] ?? 0}
                onChange={(event) => {
                  const next = [...stated];
                  next[index] = Number(event.target.value);
                  setStated(next);
                }}
                aria-valuetext={`${stated[index]} percent`}
                className="h-1.5 w-full cursor-pointer accent-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              />
            </div>
          ))}
          <p className="bg-paper px-3 py-2 text-xs leading-5 text-muted" aria-live="polite">
            {total === 100
              ? "The weights add up to 100%."
              : `The weights add up to ${total}%; the coach scales them to 100%, as it does with real rules.`}
          </p>
        </div>

        <div className={`${CARD} flex flex-col gap-5 p-5 sm:p-6`}>
          <span className="text-sm text-muted">So the coach says</span>
          <div className="flex h-2.5 w-full gap-0.5 overflow-hidden" aria-hidden="true">
            {notes.map((note, rank) => (
              <span
                key={note.criterion}
                className="h-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
                style={{ width: `${note.weight}%`, opacity: SHADES[rank] ?? 0.2 }}
              />
            ))}
          </div>
          <ol className="flex flex-col gap-3" aria-live="polite">
            {notes.map((note, rank) => (
              <li key={note.criterion} className="flex gap-3 border border-line bg-paper/60 p-3.5">
                <span
                  className="mt-1.5 size-2.5 shrink-0 bg-accent"
                  style={{ opacity: SHADES[rank] ?? 0.2 }}
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-3 text-sm font-medium">
                    <span>{note.criterion}</span>
                    <span className="font-mono tabular-nums">{note.weight}%</span>
                  </span>
                  <span className="text-[13px] leading-5 text-muted">{note.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
