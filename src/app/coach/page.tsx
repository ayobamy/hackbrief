import type { Metadata } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

import { Coach } from "./coach";

export const metadata: Metadata = {
  title: "Coach",
  description:
    "Paste a hackathon's rules and judging criteria; get the key dates, a submission checklist and a strategy weighted by the rubric.",
};

export default function CoachPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
        <header className="flex flex-col gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Coach</p>
          <h1 className="text-5xl tracking-[-0.02em]">Paste the rules, get a plan</h1>
          <p className="text-muted">
            Paste a hackathon&apos;s rules and judging criteria. hackbrief pulls out the dates, who can
            enter and what to submit, and turns the judging weights into where to spend your time.
          </p>
        </header>
        <Coach />
      </main>
      <SiteFooter />
    </>
  );
}
