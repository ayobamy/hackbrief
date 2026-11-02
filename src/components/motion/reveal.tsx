"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Phase = "unknown" | "below" | "seen";

/**
 * Whether an element has been seen. It starts "unknown", which counts as visible, so the server and
 * visitors without JavaScript see everything. The observer then reports "below" for content not yet
 * on screen and "seen" once it scrolls in. Under reduced motion nothing is observed at all.
 */
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [phase, setPhase] = useState<Phase>("unknown");

  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setPhase("seen");
          observer.disconnect();
        } else {
          setPhase((current) => (current === "unknown" ? "below" : current));
        }
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, phase, inView: phase !== "below" };
}

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-reveal={inView ? "shown" : "pending"}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
