import type { ReactNode } from "react";

/** A panel set like a printed sheet: flat, square, edged with a hairline (docs/brand.md). */
export const SHEET = "border border-line bg-panel";

/** A small-capitals label in the mono, for the parts of a sheet. */
export const LABEL = "font-mono text-[11px] tracking-[0.12em] text-muted uppercase";

export function Sheet({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${SHEET} ${className}`}>{children}</div>;
}

/** A footnote number tying a part of the brief to its lines in the rules; inked while selected. */
export function Footnote({ n, active = false, className = "" }: { n: number; active?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex size-[18px] shrink-0 items-center justify-center font-mono text-[10.5px] tabular-nums transition-colors duration-300 motion-reduce:transition-none ${
        active ? "bg-ink text-paper" : "text-muted ring-1 ring-line ring-inset"
      } ${className}`}
      aria-hidden="true"
    >
      {n}
    </span>
  );
}

/** A ticked box, as printed on a checklist. */
export function Tick() {
  return (
    <svg viewBox="0 0 14 14" className="mt-[3px] size-3.5 shrink-0 text-ink" aria-hidden="true">
      <rect x="0.5" y="0.5" width="13" height="13" fill="none" stroke="currentColor" strokeOpacity="0.45" />
      <path d="M3.2 7.3 5.8 9.8 10.9 4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** A card that lifts off a Surface: square, with a soft shadow (docs/brand.md). */
export const CARD = "border border-line bg-panel shadow-card";

/**
 * The dotted surface the landing page's interactive pieces sit on (the coach demo, the rubric
 * playground), with a faint glow in one corner. Square, like every panel.
 */
export function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden border border-line bg-panel/40 ${className}`}>
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-80" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -top-40 -right-32 h-80 w-[28rem] rounded-full bg-accent/[0.07] blur-3xl"
        aria-hidden="true"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
