"use client";

import { useState } from "react";

import {
  PLATFORMS,
  VERDICT_LABELS,
  type Verdict,
} from "@/lib/platforms/catalogue";

const DOT: Readonly<Record<Verdict, string>> = {
  use: "bg-accent",
  care: "bg-accent/50",
  ask: "bg-ink",
  link: "bg-muted",
  "do-not-collect": "border border-muted bg-transparent",
};

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul
      className="flex shrink-0 items-center gap-8 pr-8"
      aria-hidden={hidden || undefined}
    >
      {PLATFORMS.map((platform) => (
        <li
          key={platform.name}
          className="flex items-center gap-2 whitespace-nowrap text-sm text-muted"
        >
          <span
            className={`size-2 shrink-0 rounded-full ${DOT[platform.verdict]}`}
            aria-hidden="true"
          />
          <span>{platform.name}</span>
          <span className="sr-only">: {VERDICT_LABELS[platform.verdict]}</span>
        </li>
      ))}
    </ul>
  );
}

/** Every platform whose terms hackr read, scrolling past, with a control to pause it (WCAG 2.2.2). */
export function PlatformMarquee() {
  // The button's choice and the pointer resting on the band each pause it, separately.
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <div className="group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div
          className="marquee-track flex w-max"
          data-paused={paused || hovered}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <Row />
          <Row hidden />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          className="rounded-md border border-line px-2.5 py-1 font-mono uppercase tracking-[0.12em] hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {/* The label says what a press does next, so the button carries no pressed state. */}
          {paused ? "Play" : "Pause"}
          <span className="sr-only"> the moving list of platforms</span>
        </button>
        {(Object.keys(VERDICT_LABELS) as Verdict[]).map((verdict) => (
          <span key={verdict} className="flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${DOT[verdict]}`}
              aria-hidden="true"
            />
            {VERDICT_LABELS[verdict]}
          </span>
        ))}
      </div>
    </div>
  );
}
