/**
 * hackr's mark: a bold lowercase "h" in an ink square, with an orange block beside it, a typing
 * cursor: hacking, and the next move. It follows the colour theme through the CSS variables.
 */
export function LogoMark({ className = "size-7", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <path
        d="M8.5 7.5V24.5M8.5 17.6c0-3.1 2.1-5.2 5-5.2s5 2.1 5 5.2v6.9"
        fill="none"
        stroke="var(--paper)"
        strokeWidth="3.6"
      />
      <rect x="22" y="17.6" width="3.2" height="6.9" fill="var(--accent)" />
    </svg>
  );
}

/** The mark and the wordmark together, as used in the header and footer. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="text-lg font-semibold tracking-[-0.03em]">hackr</span>
    </span>
  );
}
