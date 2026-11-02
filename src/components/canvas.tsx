import type { ReactNode } from "react";

/** A floating card on the canvas: one idea per card, with room around it. */
export const CARD = "rounded-2xl border border-line bg-panel shadow-card";

/** A small rounded label for one fact, such as "1 to 4 people". */
export const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1 text-sm";

/** The dotted surface the landing page's product cards float on, with a faint glow in one corner. */
export function Canvas({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-line bg-panel/40 ${className}`}
    >
      <div
        className="dot-grid pointer-events-none absolute inset-0 opacity-80"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -top-40 -right-32 h-80 w-[28rem] rounded-full bg-accent/[0.07] blur-3xl"
        aria-hidden="true"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** A numbered step on a connector line; filled with the accent while its card is selected. */
export function StepBadge({
  n,
  active = false,
  className = "",
}: {
  n: number;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs tabular-nums transition-colors duration-300 motion-reduce:transition-none ${
        active
          ? "border-accent bg-accent text-on-accent"
          : "border-line bg-paper text-muted"
      } ${className}`}
      aria-hidden="true"
    >
      {n}
    </span>
  );
}

/** Corner handles, as a design tool draws around a selection, on the card being explained. */
export function Handles() {
  const corner = "absolute size-[7px] border border-accent bg-paper";
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span className={`${corner} -top-[4px] -left-[4px]`} />
      <span className={`${corner} -top-[4px] -right-[4px]`} />
      <span className={`${corner} -bottom-[4px] -left-[4px]`} />
      <span className={`${corner} -right-[4px] -bottom-[4px]`} />
    </span>
  );
}

export function Check({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect width="16" height="16" rx="5" fill="var(--accent)" />
      <path
        d="M4.5 8.2 7 10.6l4.6-5.2"
        fill="none"
        stroke="var(--on-accent)"
        strokeWidth="1.8"
      />
    </svg>
  );
}
