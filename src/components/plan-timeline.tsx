"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { daysBetween } from "@/lib/coach/dates";
import { formatDate, formatDaysLeft } from "@/lib/coach/format";
import { localToday } from "@/lib/coach/brief";
import type { Timeline } from "@/lib/coach/timeline";

import { LABEL, Sheet } from "./sheet";

const noSubscription = () => () => undefined;
const serverDay = () => null;

// The line has filled up to a step once that step's dot passes this far down the screen.
const FILL_AT = 0.6;

export interface PlanTimelineProps {
  name: string;
  steps: ReadonlyArray<{ date: string; title: string; detail: string }>;
  timeline: Timeline;
  deadline: { date: string; time: string | null } | null;
}

/**
 * The countdown to a hackathon, brought to life: a calendar strip of every day it covers, with the
 * hacking days shaded, above the steps on a line that fills with the accent as you scroll. Pointing at a step lights its day
 * on the strip; otherwise the strip follows the last step the line has reached. Without JavaScript, or
 * under reduced motion, the line is simply full.
 */
export function PlanTimeline({
  name,
  steps,
  timeline,
  deadline,
}: PlanTimelineProps) {
  const today = useSyncExternalStore(noSubscription, localToday, serverDay);
  const [progress, setProgress] = useState(1);
  const [lit, setLit] = useState(steps.length);
  const [pointed, setPointed] = useState<number | null>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    let frame = 0;
    const measure = () => {
      frame = 0;
      const track = trackRef.current?.getBoundingClientRect();
      const dots = listRef.current?.querySelectorAll<HTMLElement>("[data-dot]");
      if (!track || !dots || track.height === 0) {
        return;
      }
      const line = window.innerHeight * FILL_AT;
      setProgress(Math.min(1, Math.max(0, (line - track.top) / track.height)));
      setLit(
        [...dots].filter((dot) => dot.getBoundingClientRect().top <= line)
          .length,
      );
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(measure);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const shown = pointed ?? (lit > 0 ? lit - 1 : null);
  const countdown =
    deadline && today
      ? formatDaysLeft(daysBetween(today, deadline.date))
      : null;

  return (
    <Sheet>
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
        <span className={LABEL}>Prep plan</span>
        <span className="text-sm text-muted">{name}</span>
      </div>

      {/* The calendar strip repeats the list below, so screen readers skip it. */}
      <div className="border-b border-line px-5 pt-4 pb-3" aria-hidden="true">
        <div className="flex">
          {timeline.days.map((day) => {
            const isShown = day.step !== null && day.step === shown;
            return (
              <div
                key={day.date}
                className="relative flex min-w-0 flex-1 flex-col items-center"
              >
                <span className="h-4 self-start font-mono text-[10px] tracking-[0.08em] whitespace-nowrap text-muted uppercase">
                  {day.month ?? ""}
                </span>
                <span
                  className={`relative flex h-8 w-full items-center justify-center ${day.hacking ? "bg-accent/15" : ""}`}
                >
                  <span
                    className={`w-px ${day.step === null ? "h-2.5 bg-line" : "h-4 bg-muted/50"}`}
                  />
                  {day.step !== null ? (
                    <span
                      className={`absolute rounded-full transition-all duration-300 motion-reduce:transition-none ${
                        isShown
                          ? "size-3.5 bg-accent ring-4 ring-accent/20"
                          : "size-2.5 bg-ink"
                      }`}
                    />
                  ) : null}
                </span>
                <span
                  className={`h-4 pt-1 font-mono text-[10px] tabular-nums transition-colors ${
                    isShown ? "text-ink" : "text-muted"
                  }`}
                >
                  {day.step !== null ? day.day : ""}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-ink" />
            Plan steps
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 bg-accent/30" />
            Hacking days
          </span>
        </p>
      </div>

      <ol ref={listRef} className="relative px-5 py-4">
        <span
          ref={trackRef}
          className="absolute top-7 bottom-8 left-[25px] w-[2px] bg-line"
          aria-hidden="true"
        >
          <span
            className="block w-full bg-accent transition-[height] duration-200 ease-out motion-reduce:transition-none"
            style={{ height: `${progress * 100}%` }}
          />
        </span>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const reached = index < lit;
          const gap = timeline.gaps[index];
          return (
            <li
              key={step.title}
              className="relative pl-7"
              onMouseEnter={() => setPointed(index)}
              onMouseLeave={() => setPointed(null)}
            >
              {gap ? (
                <p className="py-1.5 pl-2 font-mono text-[10.5px] text-muted">
                  {gap}
                </p>
              ) : null}
              <div
                className={`relative px-2 py-2 transition-colors duration-300 motion-reduce:transition-none ${
                  shown === index ? "bg-accent/[0.07]" : ""
                }`}
              >
                <span
                  data-dot
                  className={`absolute top-3.5 -left-[13px] size-3 rounded-full border-2 transition-colors duration-300 motion-reduce:transition-none ${
                    reached ? "border-accent bg-accent" : "border-line bg-panel"
                  } ${isLast ? "ring-4 ring-accent/15" : ""}`}
                  aria-hidden="true"
                />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="font-mono text-xs text-muted tabular-nums">
                    {formatDate(step.date)}
                  </span>
                  {isLast && countdown ? (
                    <span className="bg-accent/20 px-1.5 py-0.5 font-mono text-[10.5px] tracking-[0.08em] uppercase">
                      {countdown}
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-0.5 font-medium ${isLast ? "text-base" : "text-sm"}`}
                >
                  {step.title}
                  {isLast && deadline?.time ? (
                    <span className="font-normal text-muted">
                      {" "}
                      by {deadline.time}
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-[13px] leading-5 text-muted">
                  {step.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
