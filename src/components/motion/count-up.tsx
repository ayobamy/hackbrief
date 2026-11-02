"use client";

import { useEffect, useRef, useState } from "react";

import { useInView } from "./reveal";

const DURATION_MS = 1200;

/**
 * A number that counts up from zero when it scrolls into view. The server renders the final value,
 * so it is right without JavaScript; numbers already on screen, and visitors who ask for reduced
 * motion, get the final value straight away.
 */
export function CountUp({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const { ref, phase } = useInView<HTMLSpanElement>(0.5);
  const [shown, setShown] = useState<number | null>(null);
  const wasBelow = useRef(false);

  useEffect(() => {
    // Only a number that started below the fold counts up; one already on screen just shows.
    if (phase === "below") {
      wasBelow.current = true;
      return;
    }
    if (phase !== "seen" || !wasBelow.current) {
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / DURATION_MS);
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, value]);

  const display = phase === "below" ? 0 : (shown ?? value);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{value}</span>
    </span>
  );
}
