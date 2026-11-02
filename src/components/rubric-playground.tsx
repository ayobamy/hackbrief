"use client";

import { useId, useMemo, useState } from "react";

import { CRITERIA, rubricFrom, START } from "@/lib/coach/rubric";
import { buildStrategy } from "@/lib/coach/strategy";

const LABEL = "font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted";

/** Change a rubric's weights and watch the coach rewrite its advice, live. */
export function RubricPlayground() {
  const [stated, setStated] = useState<number[]>(START);
  const baseId = useId();
  const rubric = useMemo(() => rubricFrom(stated), [stated]);
  const notes = useMemo(() => buildStrategy(rubric), [rubric]);
  const total = rubric.statedTotal ?? 0;

  return (
    <div className="grid overflow-hidden rounded-2xl border border-line bg-panel lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex flex-col gap-5 border-b border-line p-6 lg:border-r lg:border-b-0">
        <div className="flex items-baseline justify-between">
          <span className={LABEL}>The rubric says</span>
          <button
            type="button"
            onClick={() => setStated(START)}
            className="text-xs text-muted underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
        <p className="text-xs text-muted" aria-live="polite">
          {total === 100
            ? "The weights add up to 100%."
            : `The weights add up to ${total}%; the coach scales them to 100%, as it does with real rules.`}
        </p>
      </div>

      <div className="flex flex-col gap-4 p-6">
        <span className={LABEL}>So the coach says</span>
        <ol className="flex flex-col gap-4" aria-live="polite">
          {notes.map((note) => (
            <li key={note.criterion} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm font-medium">
                <span>{note.criterion}</span>
                <span className="font-mono tabular-nums">{note.weight}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-line" aria-hidden="true">
                <div className="h-1 rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${note.weight}%` }} />
              </div>
              <p className="text-[13px] leading-5 text-muted">{note.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
