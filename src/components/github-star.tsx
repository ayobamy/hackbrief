import type { CSSProperties } from "react";

// A five-pointed star drawn for hackbrief, not copied from an icon set.
const STAR = "8,1.2 10.1,5.5 14.8,6.1 11.4,9.4 12.3,14.1 8,11.8 3.7,14.1 4.6,9.4 1.2,6.1 5.9,5.5";

// Where each speck flies when the star is pointed at.
const SPECKS: ReadonlyArray<{ x: string; y: string; delay: string }> = [
  { x: "-11px", y: "-9px", delay: "0ms" },
  { x: "11px", y: "-10px", delay: "40ms" },
  { x: "-9px", y: "10px", delay: "80ms" },
  { x: "12px", y: "8px", delay: "20ms" },
];

/**
 * "Star it on GitHub" as GitHub draws its own button: grey, with a star in front. Pointing at it, or
 * focusing it from the keyboard, fills the star with gold, pops it, turns it a point and throws a few
 * specks; nothing moves on its own, and under reduced motion only the colour changes.
 */
export function GitHubStar({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-2.5 border border-gh-button-border bg-gh-button px-5 py-3 text-sm font-medium text-gh-button-text transition-colors hover:bg-gh-button-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none"
    >
      <span className="relative inline-flex size-4" aria-hidden="true">
        {/* Motion only where it is welcome: under reduced motion the star just turns gold. */}
        <span className="absolute inset-0 duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-safe:transition-[rotate,scale] motion-safe:group-hover:scale-125 motion-safe:group-hover:rotate-[72deg] motion-safe:group-focus-visible:scale-125 motion-safe:group-focus-visible:rotate-[72deg]">
          <svg viewBox="0 0 16 16" className="absolute inset-0 size-4">
            <polygon points={STAR} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          <svg
            viewBox="0 0 16 16"
            className="absolute inset-0 size-4 text-star opacity-0 transition-[opacity,scale] duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:scale-50 motion-safe:group-hover:scale-100 motion-safe:group-focus-visible:scale-100"
          >
            <polygon points={STAR} fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </span>
        {SPECKS.map((speck) => (
          <span
            key={`${speck.x}${speck.y}`}
            className="absolute top-1/2 left-1/2 -mt-[1.5px] -ml-[1.5px] hidden size-[3px] rounded-full bg-star opacity-0 motion-safe:block motion-safe:group-hover:animate-[sparkle_600ms_ease-out_both] motion-safe:group-focus-visible:animate-[sparkle_600ms_ease-out_both]"
            style={{ "--to-x": speck.x, "--to-y": speck.y, animationDelay: speck.delay } as CSSProperties}
          />
        ))}
      </span>
      Star it on GitHub
    </a>
  );
}
