"use client";

import { useEffect, useState } from "react";

/** The sticky list of steps beside "how it works", marking the one in view. */
export function StepRail({ steps }: { steps: ReadonlyArray<{ id: string; label: string }> }) {
  const [active, setActive] = useState(steps[0]?.id ?? "");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) {
          setActive(top.target.id);
        }
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    for (const step of steps) {
      const element = document.getElementById(step.id);
      if (element) {
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [steps]);

  return (
    <nav aria-label="How it works" className="sticky top-28 hidden lg:block">
      <ol className="flex flex-col gap-3 border-l border-line">
        {steps.map((step, index) => (
          <li key={step.id}>
            <a
              href={`#${step.id}`}
              aria-current={active === step.id ? "step" : undefined}
              className={`-ml-px flex items-center gap-3 border-l-2 py-1 pl-4 font-mono text-xs tracking-[0.14em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                active === step.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              {step.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
