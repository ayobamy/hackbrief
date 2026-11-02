"use client";

import { useId, useMemo, useState } from "react";

import { CRITERIA, rubricFrom, START } from "@/lib/coach/rubric";
import { buildStrategy } from "@/lib/coach/strategy";

import { LABEL, Sheet } from "./sheet";

/** Change a rubric's weights and watch the coach rewrite its advice, live. */
export function RubricPlayground() {
  const [stated, setStated] = useState<number[]>(START);
  const baseId = useId();
  const rubric = useMemo(() => rubricFrom(stated), [stated]);
  const notes = useMemo(() => buildStrategy(rubric), [rubric]);
  const total = rubric.statedTotal ?? 0;

  return (
    <Sheet className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:divide-x lg:divide-line">
      <div className="flex flex-col gap-5 border-b border-line p-5 sm:p-6 lg:border-b-0">
        <div className="flex items-baseline justify-between">
          <span className={LABEL}>The rubric says</span>
          <button
            type="button"
            onClick={() => setStated(START)}
            className="font-mono text-[11px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Reset
          </button>
        </div>
        {CRITERIA.map((name, index) => (
          <div key={name} className="flex flex-col gap-2">
            <label htmlFor={`${baseId}-${index}`} className="flex items-baseline justify-between text-sm">
              <span>{name}</span>
              <span className="font-serif text-[17px] tabular-nums">{stated[index]}%</span>
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
              className="h-1.5 w-full cursor-pointer accent-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            />
          </div>
        ))}
        <p className="border-t border-line pt-3 font-serif text-sm leading-6 text-muted italic" aria-live="polite">
          {total === 100
            ? "The weights add up to 100%."
            : `The weights add up to ${total}%; the coach scales them to 100%, as it does with real rules.`}
        </p>
      </div>

      <div className="flex flex-col p-5 sm:p-6">
        <span className={LABEL}>So the coach says</span>
        <ol className="mt-3 flex flex-col divide-y divide-line" aria-live="polite">
          {notes.map((note) => (
            <li key={note.criterion} className="flex flex-col gap-1.5 py-3.5">
              <span className="flex items-baseline">
                <span className="text-sm">{note.criterion}</span>
                <span className="mx-2 flex-1 translate-y-[-3px] border-b border-dotted border-muted/50" aria-hidden="true" />
                <span className="font-serif text-[17px] tabular-nums">{note.weight}%</span>
              </span>
              <span className="h-[2px] w-full bg-line" aria-hidden="true">
                <span
                  className={`block h-[2px] transition-[width] duration-500 motion-reduce:transition-none ${
                    note.emphasis === "focus" ? "bg-ink" : "bg-muted/60"
                  }`}
                  style={{ width: `${note.weight}%` }}
                />
              </span>
              <span className="text-[13px] leading-5 text-muted">{note.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </Sheet>
  );
}
